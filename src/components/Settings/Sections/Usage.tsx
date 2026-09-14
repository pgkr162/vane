'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/provider';
import { formatTokens, formatUsdFromCents } from '@/lib/usage/format';

type UsagePayload = {
  period: string;
  usedTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCents: number;
  monthlyTokenLimit: number;
  remainingTokens: number | null;
  enforce: boolean;
  canConfigure: boolean;
  byModel: Array<{
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCents: number;
  }>;
};

const UsageSection = () => {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsagePayload | null>(null);
  const [limit, setLimit] = useState('2000000');
  const [enforce, setEnforce] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const response = await fetch('/api/usage', { cache: 'no-store' });
    if (!response.ok) return;
    const data = (await response.json()) as UsagePayload;
    setUsage(data);
    setLimit(String(data.monthlyTokenLimit));
    setEnforce(data.enforce);
  };

  useEffect(() => {
    load().catch(() => toast.error(t('quotaLoadFailed')));
  }, []);

  const saveQuota = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/usage/quota', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyTokenLimit: Number(limit) || 0,
          enforce,
        }),
      });
      if (!response.ok) throw new Error('save failed');
      toast.success(t('quotaSaved'));
      await load();
    } catch {
      toast.error(t('quotaSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!usage) {
    return (
      <div className="px-6 py-6 text-sm text-black/60 dark:text-white/60">
        {t('loading')}
      </div>
    );
  }

  const unlimited = usage.monthlyTokenLimit === 0;

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      <div className="rounded-xl border border-light-200 bg-light-primary/80 p-4 dark:border-dark-200 dark:bg-dark-primary/80">
        <p className="text-xs text-black/50 dark:text-white/50">
          {t('quotaPeriod', { period: usage.period })}
        </p>
        <p className="mt-2 text-2xl font-medium text-black dark:text-white">
          {unlimited
            ? t('quotaUnlimited')
            : t('quotaRemaining', {
                remaining: formatTokens(usage.remainingTokens ?? 0),
                limit: formatTokens(usage.monthlyTokenLimit),
              })}
        </p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {t('quotaUsedEstimate', {
            used: formatTokens(usage.usedTokens),
            cost: formatUsdFromCents(usage.estimatedCents),
          })}
        </p>
        <p className="mt-3 text-xs text-black/50 dark:text-white/50">
          {t('quotaPromptCompletion', {
            prompt: formatTokens(usage.promptTokens),
            completion: formatTokens(usage.completionTokens),
          })}
        </p>
      </div>

      {usage.byModel.length > 0 ? (
        <div className="rounded-xl border border-light-200 bg-light-primary/80 p-4 dark:border-dark-200 dark:bg-dark-primary/80">
          <h5 className="text-sm text-black dark:text-white">
            {t('quotaByModel')}
          </h5>
          <div className="mt-3 space-y-2">
            {usage.byModel.map((row) => (
              <div
                key={row.model}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-black/80 dark:text-white/80">
                  {row.model}
                </span>
                <span className="text-black/60 dark:text-white/60">
                  {formatTokens(row.totalTokens)} ·{' '}
                  {formatUsdFromCents(row.estimatedCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {usage.canConfigure ? (
        <div className="rounded-xl border border-light-200 bg-light-primary/80 p-4 dark:border-dark-200 dark:bg-dark-primary/80">
          <h5 className="text-sm text-black dark:text-white">
            {t('quotaManage')}
          </h5>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            {t('quotaManageDesc')}
          </p>
          <label className="mt-4 block text-xs text-black/60 dark:text-white/60">
            {t('quotaMonthlyLimit')}
            <input
              type="number"
              min={0}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="mt-1 w-full rounded-lg border border-light-200 bg-light-secondary px-3 py-2 text-sm text-black dark:border-dark-200 dark:bg-dark-secondary dark:text-white"
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-black/80 dark:text-white/80">
            <input
              type="checkbox"
              checked={enforce}
              onChange={(event) => setEnforce(event.target.checked)}
            />
            {t('quotaEnforce')}
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={saveQuota}
            className="mt-4 rounded-lg bg-sky-500 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {t('quotaSave')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default UsageSection;
