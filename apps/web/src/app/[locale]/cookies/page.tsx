import { useTranslations } from 'next-intl';

export default function CookiePolicyPage() {
  const t = useTranslations('cookies');

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="text-muted-foreground mb-8">{t('lastUpdated')}</p>
      <p className="text-muted-foreground mb-8">{t('intro')}</p>

      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">{t('sections.what.title')}</h2>
          <p className="text-muted-foreground">{t('sections.what.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.types.title')}</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('sections.types.essential')}</li>
            <li>{t('sections.types.analytics')}</li>
            <li>{t('sections.types.preference')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.control.title')}</h2>
          <p className="text-muted-foreground">{t('sections.control.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.contact.title')}</h2>
          <p className="text-muted-foreground">{t('sections.contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
