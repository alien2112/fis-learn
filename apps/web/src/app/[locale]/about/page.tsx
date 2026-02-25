import { MissionVision } from '@/components/about/MissionVision';
import { ValuesSection } from '@/components/about/ValuesSection';
import { TimelineSection } from '@/components/about/TimelineSection';
import { TeamSection } from '@/components/about/TeamSection';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/api/site-settings';
import { DEFAULT_SITE_IMAGE_SETTINGS } from '@/lib/placeholder-images';

export default async function AboutPage({ params: { locale } }: { params: { locale: string } }) {
  const [t, apiSettings] = await Promise.all([
    getTranslations({ locale, namespace: 'about' }),
    getSiteSettings(),
  ]);
  const settings = { ...apiSettings };
  for (const k of Object.keys(DEFAULT_SITE_IMAGE_SETTINGS)) {
    const fromApi = apiSettings[k];
    if (fromApi == null || String(fromApi).trim() === '') {
      settings[k] = DEFAULT_SITE_IMAGE_SETTINGS[k];
    }
  }

  return (
    <main className="overflow-hidden">
      <section className="relative py-16 md:py-32 bg-secondary/30">
        <div className="container relative z-10 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      <MissionVision />
      <ValuesSection />
      <TimelineSection />
      <TeamSection
        teamImages={{
          sarah: settings.team_sarah_image,
          michael: settings.team_michael_image,
          emily: settings.team_emily_image,
          david: settings.team_david_image,
        }}
      />

      <section className="py-24">
        <div className="container">
          <div className="bg-primary rounded-3xl p-12 text-center text-primary-foreground max-w-4xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <h2 className="text-3xl font-bold mb-6 relative z-10">{t('cta.title')}</h2>
            <p className="text-lg opacity-90 max-w-xl mx-auto mb-8 relative z-10">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/careers">{t('cta.viewOpenings')}</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
                <Link href="/contact">{t('cta.contactUs')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
