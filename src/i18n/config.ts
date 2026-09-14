export const locales = ['zh-TW', 'en'] as const;

export type Locale = (typeof locales)[number];

export const localeCookie = 'vane_locale';

export const defaultLocale: Locale = 'zh-TW';

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-TW' || value === 'en';
}

export function htmlLang(locale: Locale) {
  return locale === 'zh-TW' ? 'zh-Hant' : 'en';
}

function cookieValue(name: string) {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

export function detectLocale(): Locale {
  const saved = cookieValue(localeCookie);
  if (isLocale(saved)) return saved;

  const mdLocale = cookieValue('md_locale');
  if (isLocale(mdLocale)) return mdLocale;

  if (typeof navigator !== 'undefined') {
    const language = navigator.language.toLowerCase();
    if (language.startsWith('zh')) return 'zh-TW';
    if (language.startsWith('en')) return 'en';
  }

  return defaultLocale;
}

export function persistLocale(locale: Locale) {
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = htmlLang(locale);
}
