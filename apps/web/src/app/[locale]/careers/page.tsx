import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Target, MapPin, TrendingUp, Star } from 'lucide-react';

export default function CareersPage() {
  const t = useTranslations('careers');

  const values = [
    { key: 'mission', Icon: Target },
    { key: 'remote', Icon: MapPin },
    { key: 'growth', Icon: TrendingUp },
    { key: 'impact', Icon: Star },
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
        <h2 className="text-2xl font-bold text-center mb-10">{t('values_title')}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {values.map(({ key, Icon }) => (
            <Card key={key}>
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{t(`values.${key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`values.${key}.desc`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold mb-6">{t('open_roles')}</h2>
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">{t('no_roles')}</p>
            <a
              href={`mailto:${t('cta_email')}`}
              className="mt-4 inline-block text-primary hover:underline font-medium"
            >
              {t('cta_email')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
