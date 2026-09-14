import clsx, { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from '@/i18n/config';
import { translate } from '@/i18n/messages';

export const cn = (...classes: ClassValue[]) => twMerge(clsx(...classes));

export const formatTimeDifference = (
  date1: Date | string,
  date2: Date | string,
  locale: Locale = 'en',
): string => {
  date1 = new Date(date1);
  date2 = new Date(date2);

  const diffInSeconds = Math.floor(
    Math.abs(date2.getTime() - date1.getTime()) / 1000,
  );

  if (diffInSeconds < 60)
    return translate(
      locale,
      diffInSeconds === 1 ? 'seconds' : 'secondsPlural',
      { n: diffInSeconds },
    );
  if (diffInSeconds < 3600) {
    const n = Math.floor(diffInSeconds / 60);
    return translate(locale, n === 1 ? 'minutes' : 'minutesPlural', { n });
  }
  if (diffInSeconds < 86400) {
    const n = Math.floor(diffInSeconds / 3600);
    return translate(locale, n === 1 ? 'hours' : 'hoursPlural', { n });
  }
  if (diffInSeconds < 31536000) {
    const n = Math.floor(diffInSeconds / 86400);
    return translate(locale, n === 1 ? 'days' : 'daysPlural', { n });
  }
  const n = Math.floor(diffInSeconds / 31536000);
  return translate(locale, n === 1 ? 'years' : 'yearsPlural', { n });
};
