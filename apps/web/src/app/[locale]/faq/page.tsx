import { useTranslations } from 'next-intl';

export default function FAQPage() {
  const t = useTranslations('faq');
  const questions = t.raw('questions') as Array<{ q: string; a: string }>;

  return (
    <main>
      <section className="py-20 text-center bg-secondary/30">
        <div className="container max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('title')}</h1>
          <p className="text-xl text-muted-foreground">{t('subtitle')}</p>
        </div>
      </section>

      <section className="py-16 container max-w-3xl">
        <div className="space-y-4">
          {questions.map((item, i) => (
            <details
              key={i}
              className="group rounded-lg border bg-card overflow-hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between p-5 font-medium list-none hover:bg-muted/40 transition-colors">
                {item.q}
                <span className="ml-4 flex-shrink-0 text-primary group-open:rotate-45 transition-transform duration-200 text-xl leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
