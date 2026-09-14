import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';
import db from '@/lib/db';
import { usageEvents, usageQuotas } from '@/lib/db/schema';
import { estimateUsageCents } from './pricing';
import { getUsageUserId } from './context';

export const DEFAULT_MONTHLY_TOKEN_LIMIT = 2_000_000;
export const DEFAULT_QUOTA_USER = '*';

export class QuotaExceededError extends Error {
  used: number;
  limit: number;

  constructor(used: number, limit: number) {
    super('TOKEN_QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
    this.used = used;
    this.limit = limit;
  }
}

export function monthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
  };
}

export function recordTokenUsage(input: {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
  userId?: string | null;
}) {
  const userId = input.userId ?? getUsageUserId();
  if (!userId) return;

  const promptTokens = Math.max(0, Math.round(input.promptTokens || 0));
  const completionTokens = Math.max(0, Math.round(input.completionTokens || 0));
  const totalTokens = Math.max(
    0,
    Math.round(input.totalTokens || promptTokens + completionTokens),
  );
  if (totalTokens <= 0) return;

  void (async () => {
    try {
      await db.insert(usageEvents).values({
        userId,
        model: input.model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCents: estimateUsageCents(
          input.model,
          promptTokens,
          completionTokens,
        ),
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to record token usage:', err);
    }
  })();
}

export async function getQuota(userId: string) {
  const personal = await db
    .select()
    .from(usageQuotas)
    .where(eq(usageQuotas.userId, userId))
    .limit(1);
  const fallback = await db
    .select()
    .from(usageQuotas)
    .where(eq(usageQuotas.userId, DEFAULT_QUOTA_USER))
    .limit(1);
  const row = personal[0] ?? fallback[0];
  return {
    monthlyTokenLimit: row?.monthlyTokenLimit ?? DEFAULT_MONTHLY_TOKEN_LIMIT,
    enforce: (row?.enforce ?? 1) === 1,
  };
}

export async function setDefaultQuota(input: {
  monthlyTokenLimit: number;
  enforce: boolean;
}) {
  const monthlyTokenLimit = Math.max(0, Math.round(input.monthlyTokenLimit));
  const existing = await db
    .select()
    .from(usageQuotas)
    .where(eq(usageQuotas.userId, DEFAULT_QUOTA_USER))
    .limit(1);
  const values = {
    userId: DEFAULT_QUOTA_USER,
    monthlyTokenLimit,
    enforce: input.enforce ? 1 : 0,
    updatedAt: new Date().toISOString(),
  };
  if (existing[0]) {
    await db
      .update(usageQuotas)
      .set({
        monthlyTokenLimit: values.monthlyTokenLimit,
        enforce: values.enforce,
        updatedAt: values.updatedAt,
      })
      .where(eq(usageQuotas.userId, DEFAULT_QUOTA_USER));
  } else {
    await db.insert(usageQuotas).values(values);
  }
  return getQuota(DEFAULT_QUOTA_USER);
}

export async function getMonthlyUsage(userId: string, now = new Date()) {
  const { start, end, label } = monthRange(now);
  const rows = await db
    .select({
      model: usageEvents.model,
      promptTokens: sql<number>`sum(${usageEvents.promptTokens})`.mapWith(
        Number,
      ),
      completionTokens: sql<number>`sum(${usageEvents.completionTokens})`.mapWith(
        Number,
      ),
      totalTokens: sql<number>`sum(${usageEvents.totalTokens})`.mapWith(Number),
      estimatedCents: sql<number>`sum(${usageEvents.estimatedCents})`.mapWith(
        Number,
      ),
    })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        gte(usageEvents.createdAt, start),
        lt(usageEvents.createdAt, end),
      ),
    )
    .groupBy(usageEvents.model)
    .orderBy(desc(sql`sum(${usageEvents.totalTokens})`));

  const usedTokens = rows.reduce((sum, row) => sum + (row.totalTokens || 0), 0);
  const promptTokens = rows.reduce(
    (sum, row) => sum + (row.promptTokens || 0),
    0,
  );
  const completionTokens = rows.reduce(
    (sum, row) => sum + (row.completionTokens || 0),
    0,
  );
  const estimatedCents = rows.reduce(
    (sum, row) => sum + (row.estimatedCents || 0),
    0,
  );
  const quota = await getQuota(userId);
  const remainingTokens =
    quota.monthlyTokenLimit === 0
      ? null
      : Math.max(0, quota.monthlyTokenLimit - usedTokens);

  return {
    period: label,
    usedTokens,
    promptTokens,
    completionTokens,
    estimatedCents,
    monthlyTokenLimit: quota.monthlyTokenLimit,
    remainingTokens,
    enforce: quota.enforce,
    blocked:
      quota.enforce &&
      quota.monthlyTokenLimit > 0 &&
      usedTokens >= quota.monthlyTokenLimit,
    byModel: rows,
  };
}

export async function assertQuota(userId: string) {
  const usage = await getMonthlyUsage(userId);
  if (usage.blocked) {
    throw new QuotaExceededError(usage.usedTokens, usage.monthlyTokenLimit);
  }
  return usage;
}
