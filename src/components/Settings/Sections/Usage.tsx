'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/provider';
import { formatTokens } from '@/lib/usage/format';

type UsagePayload = {
  period: string;
  usedTokens: number;
  monthlyTokenLimit: number | null;
  remainingTokens: number | null;
  remaining?: number | null;
  held?: number;
  helpUrl: string;
  help_url?: string;
  managedByConnect?: boolean;
  appLimit?: number | null;
  by_app?: { client_id: string; name: string; committed: number; held: number; monthly_tokens: number | null }[];
};

const UsageSection = () => {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsagePayload | null>(null);

  useEffect(() => {
    fetch('/api/usage', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('load failed');
        return response.json() as Promise<UsagePayload>;
      })
      .then(setUsage)
      .catch(() => toast.error(t('quotaLoadFailed')));
  }, [t]);

  if (!usage) {
    return (
      <div className="px-6 py-6 text-sm text-black/60 dark:text-white/60">
        {t('loading')}
      </div>
    );
  }

  const unlimited = usage.monthlyTokenLimit == null;
  const helpUrl = usage.helpUrl || usage.help_url || 'https://connect.medalsports.us/ai/usage';
  const remaining = usage.remainingTokens ?? usage.remaining ?? 0;

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
                remaining: formatTokens(remaining),
                limit: formatTokens(usage.monthlyTokenLimit ?? 0),
              })}
        </p>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {t('quotaUsedThisMonth', { used: formatTokens(usage.usedTokens) })}
        </p>
        {usage.appLimit != null ? (
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {t('quotaAppCap', { limit: formatTokens(usage.appLimit) })}
          </p>
        ) : null}
        {Number(usage.held) > 0 ? (
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {t('quotaHeld', { held: formatTokens(usage.held ?? 0) })}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-light-200 bg-light-primary/80 p-4 dark:border-dark-200 dark:bg-dark-primary/80">
        <h5 className="text-sm text-black dark:text-white">
          {t('quotaManage')}
        </h5>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          {t('quotaManageOnConnect')}
        </p>
        <a
          href={helpUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-lg bg-sky-500 px-3 py-2 text-sm text-white"
        >
          {t('quotaOpenConnect')}
        </a>
      </div>
    </div>
  );
};

export default UsageSection;
