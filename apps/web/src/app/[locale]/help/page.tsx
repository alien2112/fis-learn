import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, BookOpen, Monitor, Users } from 'lucide-react';

export default function HelpPage() {
  const t = useTranslations('help');

  const categories = [
    { key: 'account', Icon: CreditCard },
    { key: 'courses', Icon: BookOpen },
    { key: 'technical', Icon: Monitor },
    { key: 'instructors', Icon: Users },
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
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map(({ key, Icon }) => {
            const topics = t.raw(`categories.${key}.topics`) as string[];
            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    {t(`categories.${key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {topics.map((topic: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                        → {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            {t('contact_note')}{' '}
            <Link href="/contact" className="text-primary hover:underline font-medium">
              {t('contact_link')}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
