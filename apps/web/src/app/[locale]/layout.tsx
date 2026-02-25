import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AuthProvider } from '@/contexts/auth-context';
import { ChatBubble } from '@/components/chatbot';
import { CookieConsent } from '@/components/cookie-consent/CookieConsent';
import { locales, type Locale } from '@/i18n';
import { getSiteSettings } from '@/lib/api/site-settings';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const [messages, settings] = await Promise.all([
    import(`../../../messages/${locale}.json`).then((m) => m.default),
    getSiteSettings(),
  ]);
  const isRTL = locale === 'ar';

  return (
    <div lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col">
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>
          <Header logoUrl={settings.logo_url} />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatBubble />
          <CookieConsent />
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
