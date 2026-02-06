'use client';

import { useEffect, useMemo, useRef, useState, Suspense, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Code, Loader2, Palette, Search, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CourseCard, Course } from '@/components/courses/CourseCard';
import { coursesApi } from '@/lib/api/courses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type WorldId = 'programming' | 'graphic-design' | 'trading';
type WorldKey = WorldId | 'hub';

type WorldCopy = {
  label: { en: string; ar: string };
  concept: { en: string; ar: string };
  headline: { en: string; ar: string };
  subline: { en: string; ar: string };
  cta: { en: string; ar: string };
  sectionTitle: { en: string; ar: string };
  empty: { en: string; ar: string };
  searchPlaceholder: { en: string; ar: string };
  searchButton: { en: string; ar: string };
};

type WorldThemeVars = Record<string, string>;

type WorldPortal = {
  bg: string;
  fg: string;
  accent: string;
};

type World = {
  id: WorldKey;
  Icon: React.ElementType;
  copy: WorldCopy;
  theme: WorldThemeVars;
  portal?: WorldPortal;
  typography: {
    en: string;
    ar: string;
    kicker?: string;
  };
};

const HUB_WORLD: World = {
  id: 'hub',
  Icon: SlidersHorizontal,
  copy: {
    label: { en: 'World Hub', ar: 'بوابة العوالم' },
    concept: { en: 'Gateway Mode', ar: 'مود البوابة' },
    headline: { en: 'Pick a World. Commit to the Vibe.', ar: 'اختار عالمك... وخش بالمود.' },
    subline: { en: 'Three universes. Three energies. Same platform.', ar: '٣ عوالم... ٣ شخصيات... نفس المنصة.' },
    cta: { en: 'Open the Portals', ar: 'افتح البوابات' },
    sectionTitle: { en: 'All Courses', ar: 'كل الكورسات' },
    empty: { en: 'No courses yet. The hub is quiet.', ar: 'مفيش كورسات لسه... البوابة هادية.' },
    searchPlaceholder: { en: 'Search courses, instructors...', ar: 'دوّر على كورس أو مدرب...' },
    searchButton: { en: 'Search', ar: 'دور' },
  },
  theme: {
    '--background': '220 44% 4.2%',
    '--foreground': '221 50% 93.7%',
    '--card': '220 40% 8.2%',
    '--card-foreground': '221 50% 93.7%',
    '--popover': '220 40% 8.2%',
    '--popover-foreground': '221 50% 93.7%',
    '--primary': '186 100% 50%',
    '--primary-foreground': '220 44% 4.2%',
    '--secondary': '220 34% 10.8%',
    '--secondary-foreground': '221 50% 93.7%',
    '--muted': '220 34% 10.8%',
    '--muted-foreground': '218 23.6% 67.6%',
    '--accent': '231 100% 58.2%',
    '--accent-foreground': '220 44% 4.2%',
    '--border': '216 30.3% 17.5%',
    '--input': '216 30.3% 17.5%',
    '--ring': '186 100% 50%',
  },
  typography: {
    en: 'font-lab tracking-tight',
    ar: 'font-ar tracking-tight',
    kicker: 'font-mono',
  },
};

const WORLDS: Record<WorldId, World> = {
  programming: {
    id: 'programming',
    Icon: Code,
    copy: {
      label: { en: 'Programming', ar: 'الكود' },
      concept: { en: 'Neon Logic Lab', ar: 'نيون لوجيك لاب' },
      headline: { en: 'The Lab Where Ideas Compile.', ar: 'هنا هتبني دماغ مبرمج... مش بس كود.' },
      subline: { en: 'No fluff. Just systems you can ship.', ar: 'من غير لف ودوران... سيستمات تتبني وتطلع شغل.' },
      cta: { en: 'Run Your First Script', ar: 'شغّل أول سكريبت' },
      sectionTitle: { en: 'Active Experiments', ar: 'تجارب شغالة' },
      empty: { en: 'No builds in this lab yet.', ar: 'اللاب هادي دلوقتي... مفيش كورسات هنا.' },
      searchPlaceholder: { en: 'Search stacks, instructors...', ar: 'دوّر على ستاك أو مدرب...' },
      searchButton: { en: 'Scan', ar: 'فتّش' },
    },
    theme: {
      '--background': '225 44.4% 3.5%',
      '--foreground': '221 50% 93.7%',
      '--card': '220 48.8% 8.4%',
      '--card-foreground': '221 50% 93.7%',
      '--popover': '220 48.8% 8.4%',
      '--popover-foreground': '221 50% 93.7%',
      '--primary': '186 100% 50%',
      '--primary-foreground': '225 44.4% 3.5%',
      '--secondary': '213 44% 9.8%',
      '--secondary-foreground': '221 50% 93.7%',
      '--muted': '213 44% 9.8%',
      '--muted-foreground': '218 23.6% 67.6%',
      '--accent': '113 100% 71%',
      '--accent-foreground': '225 44.4% 3.5%',
      '--border': '216 30.3% 17.5%',
      '--input': '216 30.3% 17.5%',
      '--ring': '186 100% 50%',
    },
    portal: {
      bg: '#05070D',
      fg: '#E7ECF7',
      accent: '#00E5FF',
    },
    typography: {
      en: 'font-lab tracking-tight',
      ar: 'font-ar tracking-tight',
      kicker: 'font-mono',
    },
  },
  'graphic-design': {
    id: 'graphic-design',
    Icon: Palette,
    copy: {
      label: { en: 'Graphic Design', ar: 'الجرافيك' },
      concept: { en: 'Chaos Studio', ar: 'كاوس ستوديو' },
      headline: { en: 'Turn Chaos into a Signature.', ar: 'اعكّها... وطلّعها شيك.' },
      subline: { en: 'Try loud. Break rules. Keep taste.', ar: 'جرّب وبهّدِل براحتك... المهم تطلع بذوق.' },
      cta: { en: 'Drop a Poster', ar: 'ارمي أول بوستر' },
      sectionTitle: { en: 'Fresh Drops', ar: 'شغل طازة' },
      empty: { en: "Studio's quiet. Nothing to remix yet.", ar: 'الاستوديو فاضي شوية... مفيش كورسات هنا.' },
      searchPlaceholder: { en: 'Search styles, tools...', ar: 'دوّر على ستايل أو تول...' },
      searchButton: { en: 'Dig', ar: 'نبّش' },
    },
    theme: {
      '--background': '37 47.1% 93.3%',
      '--foreground': '0 0% 6.3%',
      '--card': '36 100% 97.1%',
      '--card-foreground': '0 0% 6.3%',
      '--popover': '36 100% 97.1%',
      '--popover-foreground': '0 0% 6.3%',
      '--primary': '231 100% 58.2%',
      '--primary-foreground': '36 100% 97.1%',
      '--secondary': '37 41.8% 89.2%',
      '--secondary-foreground': '0 0% 6.3%',
      '--muted': '37 41.8% 89.2%',
      '--muted-foreground': '36 9% 32.7%',
      '--accent': '356 100% 65.1%',
      '--accent-foreground': '0 0% 6.3%',
      '--border': '33 34.1% 83.3%',
      '--input': '33 34.1% 83.3%',
      '--ring': '231 100% 58.2%',
    },
    portal: {
      bg: '#FFF9F0',
      fg: '#101010',
      accent: '#2A4BFF',
    },
    typography: {
      en: 'font-studio tracking-tight',
      ar: 'font-ar-display tracking-tight',
    },
  },
  trading: {
    id: 'trading',
    Icon: TrendingUp,
    copy: {
      label: { en: 'Trading', ar: 'التريدينج' },
      concept: { en: 'Market Arena', ar: 'ماركت أرينا' },
      headline: { en: 'Calm Hands. Sharp Moves.', ar: 'إيدك ثابتة... وقرارك محسوب.' },
      subline: { en: 'Process beats panic. Control the pace.', ar: 'من غير تهور... الخطة تغلب التوتر.' },
      cta: { en: 'Run a Demo Trade', ar: 'جرّب صفقة ديمو' },
      sectionTitle: { en: 'Live Setups', ar: 'سيتابس جاهزة' },
      empty: { en: 'No setups on the board yet.', ar: 'مفيش سيتابس هنا دلوقتي... ارجع تاني.' },
      searchPlaceholder: { en: 'Search markets, setups...', ar: 'دوّر على ماركت أو سيتاب...' },
      searchButton: { en: 'Snipe', ar: 'صوّب' },
    },
    theme: {
      '--background': '213 29% 6.1%',
      '--foreground': '221 50% 93.7%',
      '--card': '213 33.3% 10.6%',
      '--card-foreground': '221 50% 93.7%',
      '--popover': '213 33.3% 10.6%',
      '--popover-foreground': '221 50% 93.7%',
      '--primary': '25 100% 50%',
      '--primary-foreground': '213 29% 6.1%',
      '--secondary': '213 33.3% 10.6%',
      '--secondary-foreground': '221 50% 93.7%',
      '--muted': '213 33.3% 10.6%',
      '--muted-foreground': '215 20% 64.7%',
      '--accent': '193 100% 59.2%',
      '--accent-foreground': '213 29% 6.1%',
      '--border': '214 31.8% 17.3%',
      '--input': '214 31.8% 17.3%',
      '--ring': '25 100% 50%',
    },
    portal: {
      bg: '#0B0F14',
      fg: '#E8EEF6',
      accent: '#FF6A00',
    },
    typography: {
      en: 'font-arena uppercase tracking-tight',
      ar: 'font-ar tracking-tight',
    },
  },
};

const WORLD_ORDER: WorldId[] = ['programming', 'graphic-design', 'trading'];

function normalizeWorldParam(raw: string | null): WorldKey | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();

  if (v === 'all' || v === 'hub') return 'hub';

  if (v === 'programming' || v === 'graphic-design' || v === 'trading') return v;

  // Compatibility: allow legacy/category-name style params.
  if (v.includes('program') || v.includes('code') || v.includes('dev')) return 'programming';
  if (v.includes('graphic') || v.includes('design')) return 'graphic-design';
  if (v.includes('trad') || v.includes('forex') || v.includes('crypto')) return 'trading';

  return null;
}

const PROGRAMMING_CATEGORY_SLUGS = new Set([
  'programming',
  'development',
  'web-development',
  'mobile-development',
  'python',
  'javascript',
  'typescript',
]);

const DESIGN_CATEGORY_SLUGS = new Set(['graphic-design', 'design', 'ui-ux-design', 'motion-graphics']);

const TRADING_CATEGORY_SLUGS = new Set(['trading', 'forex', 'crypto', 'stocks', 'stock-trading']);

function slugMatchesWorld(slug: string, worldId: WorldId) {
  if (worldId === 'programming') {
    return (
      PROGRAMMING_CATEGORY_SLUGS.has(slug) ||
      slug.includes('dev') ||
      slug.includes('program') ||
      slug.includes('code')
    );
  }

  if (worldId === 'graphic-design') {
    return DESIGN_CATEGORY_SLUGS.has(slug) || slug.includes('design') || slug.includes('ux') || slug.includes('ui');
  }

  return (
    TRADING_CATEGORY_SLUGS.has(slug) ||
    slug.includes('trad') ||
    slug.includes('market') ||
    slug.includes('forex') ||
    slug.includes('crypto')
  );
}

function nameMatchesWorld(name: string, worldId: WorldId) {
  if (worldId === 'programming') return name.includes('program') || name.includes('dev') || name.includes('code');
  if (worldId === 'graphic-design') return name.includes('design') || name.includes('graphic') || name.includes('ux');
  return name.includes('trad') || name.includes('market') || name.includes('forex') || name.includes('crypto');
}

function courseMatchesWorld(course: Course, worldId: WorldId) {
  const slug = course.categorySlug?.toLowerCase()?.trim();
  if (slug && slugMatchesWorld(slug, worldId)) return true;

  const name = (course.category || '').toLowerCase();
  if (name && nameMatchesWorld(name, worldId)) return true;

  return false;
}

function isArabicText(s: string) {
  return /[\u0600-\u06FF]/.test(s);
}

function WorldBackdrop({ worldId }: { worldId: WorldKey }) {
  if (worldId === 'hub') {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--border) / 0.30) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.30) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage:
              'radial-gradient(closest-side at 50% 10%, rgba(0,0,0,0.95), transparent 78%)',
          }}
        />
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(0,229,255,0.30), transparent 62%)',
          }}
        />
        <div
          className="absolute -top-20 -left-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(42,75,255,0.22), transparent 64%)',
          }}
        />
        <div
          className="absolute -bottom-28 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,106,0,0.22), transparent 64%)',
          }}
        />
      </div>
    );
  }

  if (worldId === 'programming') {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.35) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage:
              'radial-gradient(closest-side at 50% 10%, rgba(0,0,0,0.95), transparent 78%)',
          }}
        />
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(0,229,255,0.35), transparent 60%)',
          }}
        />
        <div
          className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(124,255,107,0.16), transparent 60%)',
          }}
        />
        <motion.div
          className="absolute left-0 right-0 h-px bg-primary/40"
          initial={{ y: 0, opacity: 0.0 }}
          animate={{ y: [24, 420, 24], opacity: [0.0, 1, 0.0] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (worldId === 'graphic-design') {
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 18%, rgba(42,75,255,0.18), transparent 52%), radial-gradient(circle at 82% 24%, rgba(255,77,90,0.16), transparent 54%), radial-gradient(circle at 60% 86%, rgba(184,255,44,0.18), transparent 55%), repeating-linear-gradient(45deg, rgba(16,16,16,0.035) 0px, rgba(16,16,16,0.035) 1px, transparent 1px, transparent 12px)',
          }}
        />
        <div
          className="absolute -top-16 left-10 h-56 w-56 rounded-[40px] blur-2xl opacity-70 animate-blob"
          style={{ backgroundColor: 'rgba(255,77,90,0.22)' }}
        />
        <div
          className="absolute top-14 right-16 h-64 w-64 rounded-[48px] blur-2xl opacity-70 animate-blob"
          style={{ backgroundColor: 'rgba(42,75,255,0.20)', animationDelay: '1.2s' }}
        />
        <div
          className="absolute -bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-[56px] blur-2xl opacity-70 animate-blob"
          style={{ backgroundColor: 'rgba(184,255,44,0.16)', animationDelay: '2.4s' }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.35) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(closest-side at 40% 10%, rgba(0,0,0,0.95), transparent 78%)',
        }}
      />
      <div
        className="absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,106,0,0.22), transparent 62%)',
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-35" viewBox="0 0 1200 420" preserveAspectRatio="none">
        <path
          d="M0 300 C 120 260, 240 320, 360 280 S 600 260, 720 240 S 960 220, 1200 190"
          fill="none"
          stroke="hsl(var(--accent) / 0.9)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="8 10"
        />
        <path
          d="M0 320 C 150 280, 300 340, 450 300 S 700 270, 900 250 S 1080 230, 1200 210"
          fill="none"
          stroke="hsl(var(--primary) / 0.9)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function WorldPortalCard({
  world,
  active,
  onClick,
  isRTL,
  variant = 'switcher',
  courseCount,
}: {
  world: World;
  active: boolean;
  onClick: () => void;
  isRTL: boolean;
  variant?: 'switcher' | 'hub';
  courseCount?: number | null;
}) {
  if (!world.portal) return null;

  const labelPrimary = isRTL ? world.copy.label.ar : world.copy.label.en;
  const labelSecondary = isRTL ? world.copy.label.en : world.copy.label.ar;

  const headlinePrimary = isRTL ? world.copy.headline.ar : world.copy.headline.en;
  const headlineSecondary = isRTL ? world.copy.headline.en : world.copy.headline.ar;

  const ctaPrimary = isRTL ? world.copy.cta.ar : world.copy.cta.en;
  const ctaSecondary = isRTL ? world.copy.cta.en : world.copy.cta.ar;

  const countPrimary =
    typeof courseCount === 'number' && courseCount > 0
      ? isRTL
        ? `${courseCount} كورس`
        : `${courseCount} ${courseCount === 1 ? 'course' : 'courses'}`
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border transition-all duration-300',
        isRTL ? 'text-right' : 'text-left',
        variant === 'hub' ? 'p-5 sm:p-6 md:p-7' : 'p-4 sm:p-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'border-primary/55 shadow-lg' : 'border-border/55 hover:border-border/80 hover:-translate-y-0.5',
      )}
      style={{ backgroundColor: world.portal.bg, color: world.portal.fg }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle at 20% 15%, ${world.portal.accent}55, transparent 55%), radial-gradient(circle at 80% 75%, ${world.portal.accent}22, transparent 55%)`,
        }}
      />
      <div
        className={cn('absolute inset-0 opacity-30', world.id === 'programming' && 'mix-blend-screen')}
        style={{
          backgroundImage:
            world.id === 'graphic-design'
              ? 'repeating-linear-gradient(45deg, rgba(16,16,16,0.06) 0px, rgba(16,16,16,0.06) 1px, transparent 1px, transparent 10px)'
              : 'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: world.id === 'graphic-design' ? 'auto' : '22px 22px',
        }}
      />

      <div className="relative flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{
            backgroundColor: world.id === 'graphic-design' ? 'rgba(16,16,16,0.08)' : 'rgba(255,255,255,0.10)',
            boxShadow: active ? `0 0 0 1px ${world.portal.accent}66` : undefined,
          }}
        >
          <world.Icon className="h-5 w-5" style={{ color: world.portal.accent }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div
              className={cn('text-sm font-semibold', isRTL ? world.typography.ar : world.typography.en)}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {labelPrimary}
            </div>
            <div
              className={cn('text-xs opacity-80', isArabicText(labelSecondary) ? 'font-ar' : world.typography.en)}
              dir={isRTL ? 'ltr' : 'rtl'}
            >
              {labelSecondary}
            </div>
          </div>
        </div>
      </div>

      {variant === 'hub' ? (
        <div className="relative mt-5">
          <div
            className={cn(
              'text-xl sm:text-2xl font-extrabold leading-tight',
              isRTL ? world.typography.ar : world.typography.en,
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {headlinePrimary}
          </div>
          <div
            className={cn(
              'mt-2 text-sm sm:text-base font-semibold opacity-90',
              isArabicText(headlineSecondary) ? 'font-ar' : world.typography.en,
            )}
            dir={isRTL ? 'ltr' : 'rtl'}
          >
            {headlineSecondary}
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              {countPrimary ? (
                <div className={cn('text-xs opacity-85', isRTL ? 'font-ar' : 'font-mono')}>{countPrimary}</div>
              ) : null}
              <div className="text-sm font-semibold" dir={isRTL ? 'rtl' : 'ltr'}>
                {ctaPrimary}
              </div>
              <div
                className={cn('text-xs opacity-85', isArabicText(ctaSecondary) ? 'font-ar' : 'font-sans')}
                dir={isRTL ? 'ltr' : 'rtl'}
              >
                {ctaSecondary}
              </div>
            </div>

            <div
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300',
                world.id === 'graphic-design' ? 'bg-black/5' : 'bg-white/10',
                'group-hover:scale-105',
              )}
              style={{ boxShadow: `0 0 0 1px ${world.portal.accent}44` }}
            >
              <ArrowRight
                className={cn('h-5 w-5', isRTL ? 'rotate-180' : '')}
                style={{ color: world.portal.accent }}
              />
            </div>
          </div>
        </div>
      ) : active ? (
        <div className="relative mt-4">
          <div className="text-xs opacity-90">{isRTL ? world.copy.cta.ar : world.copy.cta.en}</div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full w-1/2 rounded-full"
              style={{ backgroundColor: world.portal.accent }}
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: isRTL ? ['100%', '-20%'] : ['-100%', '20%'] }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>
      ) : null}
    </button>
  );
}

function CoursesContent() {
  const t = useTranslations('courses');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedWorld, setSelectedWorld] = useState<WorldKey>(() => {
    const raw = searchParams.get('category') || searchParams.get('world');
    return normalizeWorldParam(raw) ?? 'hub';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridRef = useRef<HTMLElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  const activeWorld = selectedWorld === 'hub' ? HUB_WORLD : WORLDS[selectedWorld];

  useEffect(() => {
    let isMounted = true;

    const formatLevel = (level?: string | null) => {
      if (!level) return null;
      const key = level.toUpperCase();
      // @ts-ignore - next-intl has "has" but TS types don't always know nested keys.
      return t.has(`levels.${key}`) ? t(`levels.${key}`) : level;
    };

    const loadCourses = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await coursesApi.getPublished({ page: 1, limit: 60 });
        const mapped = payload.data.map((course) => {
          const primaryInstructor =
            course.instructors.find((instructor) => instructor.isPrimary) || course.instructors[0];

          const instructorName = primaryInstructor?.user?.name || t('card.staff');
          const instructorAvatar = primaryInstructor?.user?.avatarUrl || null;
          const sectionsCount = course._count?.sections;
          const categoryName = course.category?.name || t('card.uncategorized');
          const categorySlug = course.category?.slug || null;

          return {
            id: course.id,
            title: course.title,
            slug: course.slug,
            thumbnail: course.coverImageUrl ?? null,
            category: categoryName,
            categorySlug,
            level: formatLevel(course.level),
            meta: typeof sectionsCount === 'number' ? `${sectionsCount} ${t('card.sections')}` : null,
            price: course.price ?? null,
            pricingModel: course.pricingModel,
            enrollmentCount: course._count?.enrollments ?? null,
            instructor: {
              name: instructorName,
              avatar: instructorAvatar,
            },
          };
        });

        if (isMounted) setCourses(mapped);
      } catch {
        if (isMounted) setError(t('error'));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, [t]);

  useEffect(() => {
    const raw = searchParams.get('category') || searchParams.get('world');
    const parsed = normalizeWorldParam(raw);
    setSelectedWorld(parsed ?? 'hub');
  }, [searchParams]);

  const setWorldAndUrl = (next: WorldKey) => {
    setSelectedWorld(next);
    setSearchTerm('');
    const sp = new URLSearchParams(Array.from(searchParams.entries()));
    sp.set('category', next === 'hub' ? 'all' : next);
    router.push(`?${sp.toString()}`);

    if (next !== 'hub') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesWorld =
        selectedWorld === 'hub'
          ? true
          : courseMatchesWorld(course, selectedWorld);
      if (!matchesWorld) return false;

      if (!term) return true;
      return course.title.toLowerCase().includes(term) || course.instructor.name.toLowerCase().includes(term);
    });
  }, [courses, searchTerm, selectedWorld]);

  const worldCounts = useMemo(() => {
    const counts: Record<WorldId, number> = {
      programming: 0,
      'graphic-design': 0,
      trading: 0,
    };

    for (const course of courses) {
      for (const worldId of WORLD_ORDER) {
        if (!courseMatchesWorld(course, worldId)) continue;
        counts[worldId] += 1;
        break;
      }
    }

    return counts;
  }, [courses]);

  const primary = {
    headline: isRTL ? activeWorld.copy.headline.ar : activeWorld.copy.headline.en,
    subline: isRTL ? activeWorld.copy.subline.ar : activeWorld.copy.subline.en,
    cta: isRTL ? activeWorld.copy.cta.ar : activeWorld.copy.cta.en,
    concept: isRTL ? activeWorld.copy.concept.ar : activeWorld.copy.concept.en,
  };

  const secondary = {
    headline: isRTL ? activeWorld.copy.headline.en : activeWorld.copy.headline.ar,
    subline: isRTL ? activeWorld.copy.subline.en : activeWorld.copy.subline.ar,
    cta: isRTL ? activeWorld.copy.cta.en : activeWorld.copy.cta.ar,
    concept: isRTL ? activeWorld.copy.concept.en : activeWorld.copy.concept.ar,
  };

  return (
    <div
      className="min-h-screen pb-20 bg-background text-foreground"
      style={activeWorld.theme as CSSProperties}
      data-world={activeWorld.id}
    >
      <section className="relative overflow-hidden pt-24 pb-10 md:pt-28 md:pb-12">
        <WorldBackdrop worldId={activeWorld.id} />

        <div className="container relative z-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex items-center gap-3">
                <Button
                  variant={selectedWorld === 'hub' ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setWorldAndUrl('hub')}
                >
                  {selectedWorld === 'hub'
                    ? isRTL
                      ? 'كل العوالم'
                      : 'All Worlds'
                    : isRTL
                      ? 'ارجع للبوابة'
                      : 'Back to Hub'}
                </Button>
              </div>

              {selectedWorld === 'hub' ? null : (
                <Button variant="ghost" size="sm" className="hidden md:flex gap-2 text-muted-foreground">
                  <SlidersHorizontal className="w-4 h-4" />
                  {t('filters')}
                </Button>
              )}
            </div>

            {selectedWorld === 'hub' ? (
              <div className="flex flex-col gap-10">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={activeWorld.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className="max-w-3xl"
                  >
                    <h1
                      className={cn(
                        'text-4xl md:text-6xl leading-[1.03] font-extrabold',
                        isRTL ? activeWorld.typography.ar : activeWorld.typography.en,
                      )}
                    >
                      <span className="block" dir={isRTL ? 'rtl' : 'ltr'}>
                        {primary.headline}
                      </span>
                      <span
                        className={cn(
                          'mt-4 block text-lg md:text-xl font-semibold text-muted-foreground',
                          isArabicText(secondary.headline) ? 'font-ar' : activeWorld.typography.en,
                        )}
                        dir={isRTL ? 'ltr' : 'rtl'}
                      >
                        {secondary.headline}
                      </span>
                    </h1>

                    <p className={cn('mt-6 text-sm md:text-base text-muted-foreground max-w-xl', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                      {primary.subline}
                    </p>
                    <p className={cn('mt-2 text-sm md:text-base text-muted-foreground/90 max-w-xl', isArabicText(secondary.subline) ? 'font-ar' : 'font-sans')} dir={isRTL ? 'ltr' : 'rtl'}>
                      {secondary.subline}
                    </p>

                    <div className="mt-8 flex">
                      <Button
                        size="lg"
                        className="h-auto py-3.5 px-6 rounded-2xl gap-4 justify-between"
                        onClick={() => portalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      >
                        <span className="flex flex-col items-start">
                          <span className={cn('text-base font-semibold', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                            {primary.cta}
                          </span>
                          <span className={cn('text-xs font-medium opacity-85', isArabicText(secondary.cta) ? 'font-ar' : 'font-sans')} dir={isRTL ? 'ltr' : 'rtl'}>
                            {secondary.cta}
                          </span>
                        </span>
                        <ArrowRight className={cn('h-5 w-5 opacity-90', isRTL ? 'rotate-180' : '')} />
                      </Button>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div ref={portalRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {WORLD_ORDER.map((id) => (
                    <WorldPortalCard
                      key={id}
                      world={WORLDS[id]}
                      active={false}
                      variant="hub"
                      courseCount={worldCounts[id]}
                      onClick={() => setWorldAndUrl(id)}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-7">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeWorld.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                      className="max-w-2xl"
                    >
                      <h1
                        className={cn(
                          'text-4xl md:text-6xl leading-[1.03] font-extrabold',
                          isRTL ? activeWorld.typography.ar : activeWorld.typography.en,
                        )}
                      >
                        <span className="block" dir={isRTL ? 'rtl' : 'ltr'}>
                          {primary.headline}
                        </span>
                        <span
                          className={cn(
                            'mt-4 block text-lg md:text-xl font-semibold text-muted-foreground',
                            isArabicText(secondary.headline) ? 'font-ar' : activeWorld.typography.en,
                          )}
                          dir={isRTL ? 'ltr' : 'rtl'}
                        >
                          {secondary.headline}
                        </span>
                      </h1>

                      <p className={cn('mt-6 text-sm md:text-base text-muted-foreground max-w-xl', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                        {primary.subline}
                      </p>
                      <p className={cn('mt-2 text-sm md:text-base text-muted-foreground/90 max-w-xl', isArabicText(secondary.subline) ? 'font-ar' : 'font-sans')} dir={isRTL ? 'ltr' : 'rtl'}>
                        {secondary.subline}
                      </p>

                      <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        <Button
                          size="lg"
                          className="h-auto py-3.5 px-6 rounded-2xl gap-4 justify-between"
                          onClick={() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        >
                          <span className="flex flex-col items-start">
                            <span className={cn('text-base font-semibold', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                              {primary.cta}
                            </span>
                            <span className={cn('text-xs font-medium opacity-85', isArabicText(secondary.cta) ? 'font-ar' : 'font-sans')} dir={isRTL ? 'ltr' : 'rtl'}>
                              {secondary.cta}
                            </span>
                          </span>
                          <ArrowRight className={cn('h-5 w-5 opacity-90', isRTL ? 'rotate-180' : '')} />
                        </Button>

                        <div className="flex-1 min-w-[240px]">
                          <div className="relative">
                            <Search className={cn('absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                            <Input
                              placeholder={isRTL ? activeWorld.copy.searchPlaceholder.ar : activeWorld.copy.searchPlaceholder.en}
                              className={cn('h-12 rounded-2xl border-primary/25 focus-visible:ring-primary/30', isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3')}
                              value={searchTerm}
                              onChange={(event) => setSearchTerm(event.target.value)}
                            />
                          </div>
                        </div>

                        <Button size="lg" className="h-12 rounded-2xl" disabled={isLoading}>
                          {isRTL ? activeWorld.copy.searchButton.ar : activeWorld.copy.searchButton.en}
                        </Button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="lg:col-span-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                    {WORLD_ORDER.map((id) => (
                      <WorldPortalCard
                        key={id}
                        world={WORLDS[id]}
                        active={selectedWorld === id}
                        onClick={() => setWorldAndUrl(id)}
                        isRTL={isRTL}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedWorld === 'hub' ? null : (
      <section ref={gridRef} className="container py-12">
        <div className="flex items-baseline justify-between gap-6 mb-8">
          <h2 className={cn('text-xl md:text-2xl font-bold', isRTL ? activeWorld.typography.ar : activeWorld.typography.en)}>
            {isRTL ? activeWorld.copy.sectionTitle.ar : activeWorld.copy.sectionTitle.en}
          </h2>
          <div className="text-sm text-muted-foreground">
            {isRTL ? activeWorld.copy.label.ar : activeWorld.copy.label.en}
          </div>
        </div>

        {error ? (
          <div className="text-center py-20">
            <p className="text-lg text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground">{t('error')}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </motion.div>
        )}

        {!isLoading && !error && filteredCourses.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">{isRTL ? activeWorld.copy.empty.ar : activeWorld.copy.empty.en}</p>
          </div>
        )}
      </section>
      )}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CoursesContent />
    </Suspense>
  );
}
