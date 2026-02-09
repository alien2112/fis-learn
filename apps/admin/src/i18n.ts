import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const validLocale = (locales.includes(locale as Locale) ? locale : defaultLocale) as string;

  return {
    messages: (await import(`../messages/${validLocale}.json`)).default,
    locale: validLocale,
  };
});
