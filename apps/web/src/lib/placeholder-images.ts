/**
 * Contextual placeholder images (Unsplash) for empty states across the site.
 * All URLs are used with permission via Unsplash's API/guidelines.
 */

const U = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?q=80&w=${w}&auto=format&fit=crop`;

/** Default course/lesson thumbnail when none is set (learning, laptop) */
export const DEFAULT_COURSE_IMAGE = U('1516321318423-f06f85e504b3');

/** Hero: students/collaboration in learning (homepage hero card) */
export const DEFAULT_HERO_IMAGE = U('1522202176988-66273c2fd55f', 2071);

/** Hero section: learners/students (for avatar stacks) – face-focused crops */
export const HERO_LEARNER_AVATARS = [
  U('1573496359142-b8d87734a5a2', 100), // professional woman
  U('1472099645785-5658abf4ff4e', 100), // professional man
  U('1580489944761-15a19d654956', 100), // professional woman
  U('1507003211169-0a1dd7228f2d', 100), // professional man
];

/** Blog: contextual cover images by topic */
export const BLOG_IMAGES = {
  onlineLearning: U('1516321318423-f06f85e504b3'),
  programming: U('1461749280684-dccba630e2f6'),
  certification: U('1523240795612-9a054b0db644'),
  study: U('1434030216411-0b793f4b4173'),
  remoteWork: U('1499951360447-b19be8fe80f5'),
  ai: U('1677442136019-21780ecad995'),
  mindfulness: U('1544367567-0f2fcb009e0b'),
} as const;

/** Default site image settings (used when API returns empty or missing). Keys match API site-settings. */
export const DEFAULT_SITE_IMAGE_SETTINGS: Record<string, string> = {
  hero_image_url: DEFAULT_HERO_IMAGE,
  feature_own_pace_image_url: U('1516321318423-f06f85e504b3', 2070),
  feature_mentorship_image_url: U('1531482615713-2afd69097998', 2070),
  feature_project_based_image_url: U('1522071820081-009f0129c71c', 2070),
  testimonial_alex_avatar: U('1599566150163-29194dcaad36', 1887),
  testimonial_maria_avatar: U('1494790108377-be9c29b29330', 1887),
  testimonial_david_avatar: U('1507003211169-0a1dd7228f2d', 1887),
  team_sarah_image: U('1573496359142-b8d87734a5a2', 1976),
  team_michael_image: U('1472099645785-5658abf4ff4e', 2070),
  team_emily_image: U('1580489944761-15a19d654956', 1961),
  team_david_image: U('1519085360753-af0119f7cbe7', 1974),
};
