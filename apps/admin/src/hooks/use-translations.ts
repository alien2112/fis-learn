import { useState, useEffect, createContext, useContext } from 'react';

type Locale = 'en' | 'ar';
type Messages = Record<string, any>;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Messages;
}>({
  locale: 'en',
  setLocale: () => {},
  messages: {},
});

export function useTranslations(namespace?: string) {
  const { messages, locale } = useContext(LocaleContext);

  const t = (key: string, params?: Record<string, string>) => {
    const keys = namespace ? `${namespace}.${key}` : key;
    const path = keys.split('.');
    let value: any = messages;

    for (const k of path) {
      value = value?.[k];
    }

    if (typeof value !== 'string') return key;

    // Replace params like {role} with actual values
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, paramValue),
        value
      );
    }

    return value;
  };

  return { t, locale };
}

export { LocaleContext };
export type { Locale, Messages };
