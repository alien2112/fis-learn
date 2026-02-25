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

// Pre-computed at module load time so WorldBackdrop never calls Math.random() during renders
const STAR_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  duration: Math.random() * 3 + 2,
  delay: Math.random() * 5,
  top: Math.random() * 100,
  left: Math.random() * 100,
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
}));

const SYMBOL_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  duration: 10 + Math.random() * 10,
  delay: Math.random() * 10,
  left: Math.random() * 100,
  symbol: ['{ }', '</>', '&&', '||', '=>', '[]'][i % 6],
}));

const CANDLESTICK_BARS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  height: Math.random() * 80 + 20,
  color: Math.random() > 0.5 ? '#4ADE80' : '#EF4444',
}));

const CURRENCY_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  duration: 15 + Math.random() * 10,
  delay: Math.random() * 10,
  left: Math.random() * 90,
  symbol: ['$', '€', '£', '¥', 'BTC', 'ETH'][i % 6],
}));

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
    label: { en: 'World Hub', ar: 'كل العوالم' },
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
  // Hub World: Deep, cosmic, portal-like
  if (worldId === 'hub') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-80 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[100px]"
        />

        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[10%] right-[20%] w-[500px] h-[500px] rounded-full bg-purple-500/10 blur-[120px]"
        />

        {/* Subtle twinkling stars */}
        {STAR_PARTICLES.map((star) => (
          <motion.div
            key={star.id}
            className="absolute bg-white rounded-full"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0, 1, 0] }}
            transition={{ duration: star.duration, repeat: Infinity, delay: star.delay }}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: star.width,
              height: star.height
            }}
          />
        ))}

      </div>
    );
  }

  // Programming World: Neon, Cyber, Matrix-like, Grid
  if (worldId === 'programming') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Dark base */}
        <div className="absolute inset-0 bg-[#05070D]" />

        {/* Grid System */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(to right, #00E5FF 1px, transparent 1px),
                              linear-gradient(to bottom, #00E5FF 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(circle at 50% 0%, black, transparent 80%)',
          }}
        />

        {/* Animated Scanning Line */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E5FF]/10 to-transparent"
          initial={{ top: '-100%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{ height: '30%' }}
        />

        {/* Floating Code Snippets */}
        <div className="absolute inset-0 opacity-10 font-mono text-xs text-[#00E5FF] overflow-hidden">
          {[
            'const future = await build();', 'if (bug) fix(it);', 'while(alive) { learn(); }',
            'git commit -m "legacy"', './deploy.sh --prod', 'sudo rm -rf /problems'
          ].map((txt, i) => (
            <motion.div
              key={i}
              className="absolute whitespace-nowrap"
              initial={{ x: -200, opacity: 0 }}
              animate={{ x: '100vw', opacity: [0, 1, 0] }}
              transition={{ duration: 15 + i * 2, repeat: Infinity, delay: i * 3, ease: 'linear' }}
              style={{ top: `${15 + i * 12}%` }}
            >
              {txt}
            </motion.div>
          ))}
        </div>

        {/* Floating Symbols */}
        {SYMBOL_PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute text-[#00E5FF]/20 font-mono font-bold text-2xl"
            initial={{ y: '100vh', opacity: 0 }}
            animate={{ y: '-10vh', opacity: [0, 0.5, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            style={{ left: `${p.left}%` }}
          >
            {p.symbol}
          </motion.div>
        ))}

        {/* Glowing Orbs/Nodes */}
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#00E5FF]/20 rounded-full blur-[60px]"
        />
        <motion.div
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-[80px]"
        />
      </div>
    );
  }

  // Graphic Design World: Artistic, Fluid, Vibrant, Texture
  if (worldId === 'graphic-design') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#FFF9F0]" />

        {/* Noise Texture */}
        <div className="absolute inset-0 opacity-30 mix-blend-multiply"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opactiy='0.5'/%3E%3C/svg%3E")` }}
        />

        {/* Floating Shapes */}
        <div className="absolute inset-0 opacity-20">
          {/* Triangles, Circles, Squiggles */}
          <motion.div
            className="absolute top-[20%] right-[15%] w-0 h-0 border-l-[30px] border-l-transparent border-t-[50px] border-t-[#FF4D5A] border-r-[30px] border-r-transparent mix-blend-multiply"
            animate={{ rotate: 360, y: [0, -20, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute bottom-[30%] left-[10%] w-16 h-16 rounded-full border-4 border-[#2A4BFF] mix-blend-multiply"
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* SVG Squiggle */}
          <motion.svg
            viewBox="0 0 100 20"
            className="absolute top-[40%] left-[30%] w-32 stroke-[#B8FF2C] fill-none stroke-[4px]"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          >
            <path d="M0,10 Q25,0 50,10 T100,10" />
          </motion.svg>
        </div>

        {/* Animated Blobs */}
        <motion.div
          animate={{
            translate: ['0% 0%', '10% 10%', '-5% 5%', '0% 0%'],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF4D5A]/20 blur-[80px] mix-blend-multiply"
        />

        <motion.div
          animate={{
            translate: ['0% 0%', '-10% 15%', '5% -5%', '0% 0%'],
            scale: [1, 1.2, 0.9, 1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#2A4BFF]/15 blur-[100px] mix-blend-multiply"
        />

        <motion.div
          animate={{
            translate: ['0% 0%', '15% -10%', '-10% -5%', '0% 0%'],
            scale: [1, 0.8, 1.1, 1]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-[30%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#B8FF2C]/30 blur-[60px] mix-blend-multiply"
        />

        {/* Subtle geometric overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    );
  }

  // Trading World: Professional, Data-driven, Sleek, Chart-like
  if (worldId === 'trading') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[#0B0F14]" />

        {/* Financial Grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(#2A3241 1px, transparent 1px), linear-gradient(90deg, #2A3241 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />

        {/* Candlestick Chart Simulation */}
        <div className="absolute bottom-0 left-0 right-0 h-64 flex items-end justify-around opacity-20 px-10">
          {CANDLESTICK_BARS.map((bar) => (
              <motion.div
                key={bar.id}
                className="w-2 md:w-4 relative"
                initial={{ height: '0%' }}
                animate={{ height: [`0%`, `${bar.height}%`] }}
                transition={{ duration: 1.5, delay: bar.id * 0.1, ease: 'easeOut' }}
                style={{ backgroundColor: bar.color }}
              >
                {/* Wick */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-[1px] h-[calc(100%+20px)] bg-white/50" />
              </motion.div>
            ))}
        </div>

        {/* Floating Currency Symbols */}
        {CURRENCY_PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute text-white/5 font-bold text-4xl"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: '-10%', opacity: [0, 1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
            style={{ left: `${p.left}%` }}
          >
            {p.symbol}
          </motion.div>
        ))}

        {/* Abstract Chart Line */}
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
          <motion.path
            d="M0,350 Q200,300 400,380 T800,250 T1200,100"
            fill="none"
            stroke="#FF6A00"
            strokeWidth="3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,400 Q300,350 500,420 T1000,300 T1400,150"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            opacity="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, ease: "easeInOut", delay: 1 }}
          />
        </svg>

        {/* Glowing Ticker Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-transparent to-[#0B0F14]/80" />

        {/* Dynamic Glows */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#FF6A00]/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-[#10B981]/10 rounded-full blur-[120px]" />
      </div>
    );
  }

  return null;
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

  const headlinePrimary = isRTL ? world.copy.headline.ar : world.copy.headline.en;

  const ctaPrimary = isRTL ? world.copy.cta.ar : world.copy.cta.en;

  const countPrimary =
    typeof courseCount === 'number' && courseCount > 0
      ? isRTL
        ? `${courseCount} كورس`
        : `${courseCount} ${courseCount === 1 ? 'course' : 'courses'}`
      : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border transition-all duration-500',
        isRTL ? 'text-right' : 'text-left',
        variant === 'hub' ? 'p-6 sm:p-7 md:p-8 h-full flex flex-col' : 'p-4 sm:p-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'border-primary/80 shadow-2xl' : 'border-border/40 hover:border-border/80',
      )}
      style={{
        backgroundColor: active ? `${world.portal.bg}DD` : `${world.portal.bg}BB`,
        color: world.portal.fg,
        boxShadow: active ? `0 20px 40px -10px ${world.portal.accent}33` : undefined,
        borderColor: active ? world.portal.accent : undefined
      }}
    >
      {/* Dynamic Background Sheen */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${world.portal.accent}22, transparent 70%)`,
        }}
      />

      {/* Textured overlay */}
      <div
        className={cn('absolute inset-0 opacity-20 transition-opacity duration-500', active ? 'opacity-40' : '')}
        style={{
          backgroundImage:
            world.id === 'graphic-design'
              ? 'repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 8px)'
              : 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: world.id === 'graphic-design' ? 'auto' : '20px 20px',
        }}
      />

      <div className="relative flex items-start gap-4 mb-auto">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg"
          style={{
            backgroundColor: world.id === 'graphic-design' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.10)',
            boxShadow: `0 0 20px -5px ${world.portal.accent}44`,
            color: world.portal.accent
          }}
        >
          <world.Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-col">
            <div
              className={cn('text-base font-bold tracking-tight', isRTL ? world.typography.ar : world.typography.en)}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {labelPrimary}
            </div>
          </div>
        </div>
      </div>

      {variant === 'hub' ? (
        <div className="relative mt-8 space-y-4">
          <div>
            <div
              className={cn(
                'text-2xl sm:text-3xl font-black leading-none mb-2',
                isRTL ? world.typography.ar : world.typography.en,
              )}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {headlinePrimary}
            </div>
          </div>

          <div className="pt-4 flex items-end justify-between border-t border-white/5">
            <div className="flex flex-col gap-0.5">
              {countPrimary ? (
                <div className={cn('text-xs font-mono opacity-50 mb-1', isRTL ? 'font-ar' : 'font-mono')}>{countPrimary}</div>
              ) : null}
              <div className="flex items-center gap-2 group-hover:gap-3 transition-all">
                <div className="text-sm font-bold" dir={isRTL ? 'rtl' : 'ltr'}>
                  {ctaPrimary}
                </div>
                <ArrowRight
                  className={cn('h-4 w-4 transition-transform', isRTL ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1')}
                  style={{ color: world.portal.accent }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : active ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="relative mt-4"
        >
          <div className="text-xs font-bold opacity-90 tracking-wide uppercase">{isRTL ? world.copy.cta.ar : world.copy.cta.en}</div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-black/20">
            <motion.div
              className="h-full w-1/2 rounded-full box-shadow-glow"
              style={{ backgroundColor: world.portal.accent, boxShadow: `0 0 10px ${world.portal.accent}` }}
              initial={{ x: isRTL ? '100%' : '-100%' }}
              animate={{ x: isRTL ? ['100%', '-20%'] : ['-100%', '20%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      ) : null}
    </motion.button>
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
                    </h1>

                    <p className={cn('mt-6 text-sm md:text-base text-muted-foreground max-w-xl', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                      {primary.subline}
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
                      </h1>

                      <p className={cn('mt-6 text-sm md:text-base text-muted-foreground max-w-xl', isRTL ? 'font-ar' : 'font-sans')} dir={isRTL ? 'rtl' : 'ltr'}>
                        {primary.subline}
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
