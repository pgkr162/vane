'use client';

import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';

const HOME = 'https://connect.medalsports.us/home';

export default function BackToConnect({
  variant = 'icon',
}: {
  variant?: 'icon' | 'labeled';
}) {
  const { t } = useI18n();

  if (variant === 'labeled') {
    return (
      <a
        href={HOME}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-light-200 bg-light-primary px-3 text-xs font-medium text-black/80 transition-colors hover:bg-light-secondary dark:border-dark-200 dark:bg-dark-primary dark:text-white/80 dark:hover:bg-dark-secondary"
      >
        <ArrowLeft size={14} />
        {t('backToMdConnect')}
      </a>
    );
  }

  return (
    <a
      href={HOME}
      aria-label={t('backToMdConnect')}
      title={t('backToMdConnect')}
      className={cn(
        'flex size-10 items-center justify-center rounded-full bg-light-200 text-black/70 transition duration-200 hover:opacity-70 hover:scale-105 active:scale-95 dark:bg-dark-200 dark:text-white/70',
      )}
    >
      <ArrowLeft size={18} />
    </a>
  );
}
