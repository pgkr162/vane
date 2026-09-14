'use client';

import { Gauge } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import { formatTokens, formatUsdFromCents } from '@/lib/usage/format';

type UsageSummary = {
  usedTokens: number;
  monthlyTokenLimit: number;
  remainingTokens: number | null;
  estimatedCents: number;
  enforce: boolean;
  blocked: boolean;
};

export default function UsageMeter({
  placement = 'header',
}: {
  placement?: 'header' | 'sidebar';
}) {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('/api/usage', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => setUsage(data))
        .catch(() => setUsage(null));
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!usage) return null;

  const unlimited = usage.monthlyTokenLimit === 0;
  const ratio = unlimited
    ? 0
    : Math.min(1, usage.usedTokens / Math.max(usage.monthlyTokenLimit, 1));
  const remainingLabel = unlimited
    ? t('quotaUnlimited')
    : t('quotaRemaining', {
        remaining: formatTokens(usage.remainingTokens ?? 0),
        limit: formatTokens(usage.monthlyTokenLimit),
      });

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            aria-label={t('quotaTitle')}
            title={remainingLabel}
            className={cn(
              'flex items-center justify-center outline-none transition duration-200',
              placement === 'sidebar'
                ? 'size-10 rounded-full bg-light-200 text-black/70 hover:opacity-70 hover:scale-105 active:scale-95 dark:bg-dark-200 dark:text-white/70'
                : 'size-9 rounded-full border border-light-200 text-black/70 hover:bg-light-secondary dark:border-dark-200 dark:text-white/70 dark:hover:bg-dark-secondary',
              usage.blocked
                ? 'text-red-500'
                : ratio >= 0.8
                  ? 'text-amber-500'
                  : '',
            )}
          >
            <Gauge size={placement === 'sidebar' ? 18 : 16} />
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                static
                anchor={
                  placement === 'sidebar'
                    ? { to: 'right end', gap: 8 }
                    : { to: 'bottom end', gap: 8 }
                }
                className="z-[60]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="w-56 rounded-2xl border border-light-200 bg-light-primary p-3 shadow-lg dark:border-dark-200 dark:bg-dark-primary"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                    {t('quotaTitle')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-black dark:text-white">
                    {remainingLabel}
                  </p>
                  <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                    {t('quotaUsedEstimate', {
                      used: formatTokens(usage.usedTokens),
                      cost: formatUsdFromCents(usage.estimatedCents),
                    })}
                  </p>
                  {!unlimited && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-light-200 dark:bg-dark-200">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          usage.blocked
                            ? 'bg-red-500'
                            : ratio >= 0.8
                              ? 'bg-amber-500'
                              : 'bg-sky-500',
                        )}
                        style={{ width: `${Math.max(4, ratio * 100)}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
}
