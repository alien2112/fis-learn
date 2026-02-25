import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const t = useTranslations('pricing');

  const plans = [
    { key: 'free', variant: 'outline' as const, primary: false },
    { key: 'pro', variant: 'default' as const, primary: true },
    { key: 'enterprise', variant: 'outline' as const, primary: false },
  ] as const;

  return (
    <main>
      <section className="py-20 text-center bg-secondary/30">
        <div className="container max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground">{t('subtitle')}</p>
        </div>
      </section>

      <section className="py-16 container">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map(({ key, primary }) => {
            const features = t.raw(`${key}.features`) as string[];
            return (
              <Card key={key} className={primary ? 'border-primary shadow-lg scale-105' : ''}>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{t(`${key}.name`)}</CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">{t(`${key}.price`)}</span>
                    {t(`${key}.period`) && (
                      <span className="text-muted-foreground text-sm ml-1">/ {t(`${key}.period`)}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{t(`${key}.desc`)}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {features.map((feature: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={primary ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href={key === 'enterprise' ? '/contact' : '/register'}>
                      {t(key === 'enterprise' ? 'cta_enterprise' : key === 'pro' ? 'cta_pro' : 'free.name')}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12">
          {t('faq_note')}{' '}
          <Link href="/faq" className="text-primary hover:underline">FAQ</Link>
        </p>
      </section>
    </main>
  );
}
