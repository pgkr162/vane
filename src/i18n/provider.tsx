'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  defaultLocale,
  detectLocale,
  htmlLang,
  persistLocale,
  type Locale,
} from './config';
import { translate, type MessageKey } from './messages';

type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key, vars) => translate(defaultLocale, key, vars),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const next = detectLocale();
    setLocaleState(next);
    document.documentElement.lang = htmlLang(next);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const t = useCallback<Translate>(
    (key, vars) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}
