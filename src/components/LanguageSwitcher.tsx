'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import type { Locale } from '@/i18n/config';

export default function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { locale, setLocale, t } = useI18n();

  const options: { value: Locale; label: string }[] = [
    { value: 'zh-TW', label: '繁中' },
    { value: 'en', label: 'EN' },
  ];

  return (
    <div
      className={cn(
        'inline-flex rounded-full border border-light-200 dark:border-dark-200 p-0.5',
        compact ? 'text-[10px]' : 'text-xs',
      )}
      role="group"
      aria-label={t('language')}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.value === 'en' ? 'en' : 'zh-Hant'}
          aria-pressed={locale === option.value}
          onClick={() => setLocale(option.value)}
          className={cn(
            'rounded-full px-2 py-0.5 transition-colors',
            locale === option.value
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
