import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
export const locales = ['en', 'ar'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  // If not valid, fall back to default locale (don't use notFound in root layout)
  const validLocale = (locales.includes(locale as Locale) ? locale : defaultLocale) as string;

  return {
    messages: (await import(`../messages/${validLocale}.json`)).default,
    locale: validLocale,
  };
});
