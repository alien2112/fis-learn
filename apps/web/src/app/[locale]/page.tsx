
import { HeroSection } from '@/components/home/HeroSection';
import { StatsSection } from '@/components/home/StatsSection';
import { FeatureSection } from '@/components/home/FeatureSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { TestimonialSection } from '@/components/home/TestimonialSection';
import { CTASection } from '@/components/home/CTASection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeatureSection />
      <CategoriesSection />
      <TestimonialSection />
      <CTASection />
    </>
  );
}
