'use client';

import { Check, Globe } from 'lucide-react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/provider';
import type { Locale } from '@/i18n/config';

export default function LanguageSwitcher({
  placement = 'header',
}: {
  placement?: 'header' | 'sidebar';
}) {
  const { locale, setLocale, t } = useI18n();

  const options: { value: Locale; label: string; lang: string }[] = [
    { value: 'zh-TW', label: t('languageZh'), lang: 'zh-Hant' },
    { value: 'en', label: t('languageEn'), lang: 'en' },
  ];

  const current = options.find((option) => option.value === locale);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <PopoverButton
            type="button"
            aria-label={t('language')}
            title={t('language')}
            className={cn(
              'flex items-center justify-center outline-none transition duration-200',
              placement === 'sidebar'
                ? 'size-10 rounded-full bg-light-200 text-black/70 hover:opacity-70 hover:scale-105 active:scale-95 dark:bg-dark-200 dark:text-white/70'
                : 'size-9 rounded-full border border-light-200 text-black/70 hover:bg-light-secondary dark:border-dark-200 dark:text-white/70 dark:hover:bg-dark-secondary',
            )}
          >
            <Globe size={placement === 'sidebar' ? 18 : 16} />
            <span className="sr-only">{current?.label ?? t('language')}</span>
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
                  className="w-44 rounded-2xl border border-light-200 bg-light-primary p-1.5 shadow-lg dark:border-dark-200 dark:bg-dark-primary"
                >
                  <p className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                    {t('language')}
                  </p>
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      lang={option.lang}
                      onClick={() => {
                        setLocale(option.value);
                        close();
                      }}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-colors',
                        locale === option.value
                          ? 'bg-light-secondary text-black dark:bg-dark-secondary dark:text-white'
                          : 'text-black/70 hover:bg-light-secondary dark:text-white/70 dark:hover:bg-dark-secondary',
                      )}
                    >
                      {option.label}
                      {locale === option.value ? (
                        <Check size={14} className="text-sky-500" />
                      ) : null}
                    </button>
                  ))}
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
}
