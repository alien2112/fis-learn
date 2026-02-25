import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, DollarSign, Wrench, HeartHandshake, ArrowRight } from 'lucide-react';

export default function InstructorsPage() {
  const t = useTranslations('instructors');

  const benefits = [
    { key: 'reach', Icon: Globe },
    { key: 'income', Icon: DollarSign },
    { key: 'tools', Icon: Wrench },
    { key: 'support', Icon: HeartHandshake },
  ] as const;

  const steps = ['plan', 'create', 'publish'] as const;

  return (
    <main>
      {/* Hero */}
      <section className="py-20 bg-secondary/30 text-center">
        <div className="container max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground mb-8">{t('subtitle')}</p>
          <Button size="lg" asChild>
            <Link href="/register">{t('cta')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 container">
        <h2 className="text-2xl font-bold text-center mb-10">{t('benefits.title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map(({ key, Icon }) => (
            <Card key={key}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{t(`benefits.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`benefits.${key}.desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 bg-muted/30">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-10">{t('steps.title')}</h2>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step} className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {t(`steps.${step}.step`)}
                </div>
                <div>
                  <h3 className="font-semibold">{t(`steps.${step}.title`)}</h3>
                  <p className="text-muted-foreground text-sm">{t(`steps.${step}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button size="lg" asChild>
              <Link href="/register">{t('cta')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
