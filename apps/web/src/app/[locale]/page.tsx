import { HeroSection } from '@/components/home/HeroSection';
import { StatsSection } from '@/components/home/StatsSection';
import { FeatureSection } from '@/components/home/FeatureSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { TestimonialSection } from '@/components/home/TestimonialSection';
import { CTASection } from '@/components/home/CTASection';
import { getSiteSettings } from '@/lib/api/site-settings';
import { DEFAULT_SITE_IMAGE_SETTINGS } from '@/lib/placeholder-images';

export default async function HomePage() {
  const apiSettings = await getSiteSettings();
  const settings = { ...apiSettings };
  for (const k of Object.keys(DEFAULT_SITE_IMAGE_SETTINGS)) {
    const fromApi = apiSettings[k];
    if (fromApi == null || String(fromApi).trim() === '') {
      settings[k] = DEFAULT_SITE_IMAGE_SETTINGS[k];
    }
  }

  return (
    <>
      <HeroSection heroImageUrl={settings.hero_image_url} />
      <StatsSection />
      <FeatureSection
        featureImages={{
          ownPace: settings.feature_own_pace_image_url,
          mentorship: settings.feature_mentorship_image_url,
          projectBased: settings.feature_project_based_image_url,
        }}
      />
      <CategoriesSection />
      <TestimonialSection
        testimonialAvatars={{
          alex: settings.testimonial_alex_avatar,
          maria: settings.testimonial_maria_avatar,
          david: settings.testimonial_david_avatar,
        }}
      />
      <CTASection />
    </>
  );
}
