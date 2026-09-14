const ISSUER = process.env.MD_CONNECT_ISSUER ?? 'https://clerk.connect.medalsports.us';
const DEFAULT_USAGE_BASE = 'https://connect.medalsports.us/api/integrations/ai/usage';
const LEGACY_USAGE_BASE = 'https://connect.medalsports.us/api/integrations/vane/usage';
const USAGE_BASE = process.env.MD_CONNECT_USAGE_URL ?? DEFAULT_USAGE_BASE;
const APP = 'vane.search';
export const MD_CONNECT_USAGE_URL = 'https://connect.medalsports.us/ai/usage';

export class TokenQuotaExceededError extends Error {
  helpUrl: string;
  resetAt?: string;

  constructor(helpUrl = MD_CONNECT_USAGE_URL, resetAt?: string) {
    super('TOKEN_QUOTA_EXCEEDED');
    this.name = 'TokenQuotaExceededError';
    this.helpUrl = helpUrl;
    this.resetAt = resetAt;
  }
}

export type MdConnectAppBalance = {
  client_id: string;
  name: string;
  app_id: string;
  committed: number;
  held: number;
  monthly_tokens: number | null;
};

export type MdConnectBalance = {
  period: string;
  monthly_tokens: number | null;
  bonus: number;
  committed: number;
  held: number;
  department_limit: number | null;
  department_used: number;
  reset_at: string;
  help_url: string;
  by_app: MdConnectAppBalance[];
};

function secret() {
  const value = process.env.MD_CONNECT_INTEGRATION_SECRET;
  if (!value || value.length < 32) throw new Error('MD_CONNECT_USAGE_UNAVAILABLE');
  return value;
}

async function postOnce(base: string, path: 'reserve' | 'complete' | 'balance', body: Record<string, unknown>) {
  return fetch(`${base}/${path}`, {
    method: 'POST',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
    headers: {
      'content-type': 'application/json',
      'x-md-connect-integration-secret': secret(),
    },
    body: JSON.stringify({ ...body, iss: ISSUER, app: APP }),
  });
}

async function postUsage(path: 'reserve' | 'complete' | 'balance', body: Record<string, unknown>) {
  let result = await postOnce(USAGE_BASE, path, body);
  if (result.status === 404 && USAGE_BASE !== LEGACY_USAGE_BASE) {
    result = await postOnce(LEGACY_USAGE_BASE, path, body);
  }
  const data = (await result.json().catch(() => ({}))) as Record<string, unknown>;
  if (result.status === 429) {
    throw new TokenQuotaExceededError(
      typeof data.help_url === 'string' ? data.help_url : MD_CONNECT_USAGE_URL,
      typeof data.reset_at === 'string' ? data.reset_at : undefined,
    );
  }
  if (result.status === 403) {
    throw new TokenQuotaExceededError(
      typeof data.help_url === 'string' ? data.help_url : MD_CONNECT_USAGE_URL,
    );
  }
  if (result.status !== 200 || data.ok !== true) {
    throw new Error('MD_CONNECT_USAGE_UNAVAILABLE');
  }
  return data;
}

export function estimateSearchTokens(mode: 'speed' | 'balanced' | 'quality') {
  if (mode === 'quality') return 150_000;
  if (mode === 'speed') return 20_000;
  return 50_000;
}

export const UTILITY_TOKEN_ESTIMATE = 8_000;

export async function reserveUsage(input: {
  sub: string;
  nonce: string;
  estimatedTokens: number;
  model?: string;
}) {
  await postUsage('reserve', {
    sub: input.sub,
    nonce: input.nonce,
    estimatedTokens: input.estimatedTokens,
    model: input.model,
  });
  return input.nonce;
}

export async function completeUsage(input: {
  sub: string;
  nonce: string;
  outcome:
    | 'success'
    | 'invalid_response'
    | 'cancelled'
    | 'provider_rejected'
    | 'provider_unavailable'
    | 'not_dispatched';
  inputTokens: number | null;
  outputTokens: number | null;
}) {
  try {
    await postUsage('complete', {
      sub: input.sub,
      nonce: input.nonce,
      outcome: input.outcome,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    });
  } catch (error) {
    console.error('Failed to complete MD Connect usage:', error);
  }
}

function parseByApp(value: unknown): MdConnectAppBalance[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as Record<string, unknown>;
    return [
      {
        client_id: String(item.client_id ?? ''),
        name: String(item.name ?? ''),
        app_id: String(item.app_id ?? ''),
        committed: Number(item.committed ?? 0),
        held: Number(item.held ?? 0),
        monthly_tokens: item.monthly_tokens == null ? null : Number(item.monthly_tokens),
      },
    ];
  });
}

export async function getUsageBalance(sub: string): Promise<MdConnectBalance> {
  const data = await postUsage('balance', { sub });
  return {
    period: String(data.period ?? ''),
    monthly_tokens:
      data.monthly_tokens == null ? null : Number(data.monthly_tokens),
    bonus: Number(data.bonus ?? 0),
    committed: Number(data.committed ?? 0),
    held: Number(data.held ?? 0),
    department_limit:
      data.department_limit == null ? null : Number(data.department_limit),
    department_used: Number(data.department_used ?? 0),
    reset_at: String(data.reset_at ?? ''),
    help_url:
      typeof data.help_url === 'string' ? data.help_url : MD_CONNECT_USAGE_URL,
    by_app: parseByApp(data.by_app),
  };
}

export function settleUsage(input: {
  sub: string;
  nonce: string;
  outcome: Parameters<typeof completeUsage>[0]['outcome'];
  promptTokens: number;
  completionTokens: number;
}) {
  const known = input.promptTokens > 0 || input.completionTokens > 0;
  return completeUsage({
    sub: input.sub,
    nonce: input.nonce,
    outcome: input.outcome,
    inputTokens: known ? input.promptTokens : null,
    outputTokens: known ? input.completionTokens : null,
  });
}

export function tokenQuotaResponse(error: TokenQuotaExceededError) {
  return Response.json(
    {
      message: 'TOKEN_QUOTA_EXCEEDED',
      help_url: error.helpUrl,
      reset_at: error.resetAt,
    },
    { status: 429 },
  );
}
