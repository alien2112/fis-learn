import { NextIntlClientProvider } from 'next-intl';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AuthProvider } from '@/contexts/auth-context';
import { ChatBubble } from '@/components/chatbot';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const isRTL = locale === 'ar';

  return (
    <div lang={locale} dir={isRTL ? 'rtl' : 'ltr'} className="flex min-h-screen flex-col">
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatBubble />
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
