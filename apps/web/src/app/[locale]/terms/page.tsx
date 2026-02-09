import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('terms');

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold mb-2">{t('title')}</h1>
      <p className="text-muted-foreground mb-8">{t('lastUpdated')}</p>

      <div className="prose prose-lg max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold">{t('sections.acceptance.title')}</h2>
          <p className="text-muted-foreground">{t('sections.acceptance.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.accounts.title')}</h2>
          <p className="text-muted-foreground">{t('sections.accounts.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.content.title')}</h2>
          <p className="text-muted-foreground">{t('sections.content.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.subscriptions.title')}</h2>
          <p className="text-muted-foreground">{t('sections.subscriptions.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.termination.title')}</h2>
          <p className="text-muted-foreground">{t('sections.termination.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.liability.title')}</h2>
          <p className="text-muted-foreground">{t('sections.liability.content')}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">{t('sections.contact.title')}</h2>
          <p className="text-muted-foreground">{t('sections.contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
