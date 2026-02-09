import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('privacy');

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">{t('sections.introduction.title')}</h2>
          <p className="text-muted-foreground">{t('sections.introduction.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.dataCollection.title')}</h2>
          <p className="text-muted-foreground">{t('sections.dataCollection.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.dataUse.title')}</h2>
          <p className="text-muted-foreground">{t('sections.dataUse.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.cookies.title')}</h2>
          <p className="text-muted-foreground">{t('sections.cookies.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.rights.title')}</h2>
          <p className="text-muted-foreground">{t('sections.rights.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.contact.title')}</h2>
          <p className="text-muted-foreground">{t('sections.contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
