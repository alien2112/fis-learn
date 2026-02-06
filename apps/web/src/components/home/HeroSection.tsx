'use client';

import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { useTranslations } from 'next-intl';

export function HeroSection() {
  const t = useTranslations('hero');
  
  return (
    <section className="relative w-full overflow-hidden bg-background pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="container px-4 md:px-6 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary backdrop-blur-sm shadow-sm"
              >
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                <span className="font-semibold tracking-wide">{t('badge')}</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="text-5xl font-extrabold tracking-tight sm:text-7xl xl:text-8xl leading-[1.1]"
              >
                {t('title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">{t('titleHighlight')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="max-w-[600px] text-xl text-muted-foreground leading-relaxed"
              >
                {t('subtitle')}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300" asChild>
                <Link href="/courses">
                  {t('ctaPrimary')} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full hover:bg-muted/50 border-2 transition-all duration-300" asChild>
                <Link href="/about">
                  <PlayCircle className="mr-2 h-5 w-5" /> {t('ctaSecondary')}
                </Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="pt-6 flex items-center gap-6"
            >
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-background bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg flex items-center">
                  4.9/5 <span className="text-yellow-500 ml-1">★★★★★</span>
                </span>
                <span className="text-sm text-muted-foreground">{t('students')}</span>
              </div>
            </motion.div>
          </div>

          {/* Right side image card - keeping as is for now */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="relative lg:ml-auto hidden lg:block"
          >
            {/* Main Floating Card */}
            <div className="relative z-10 w-[550px] aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl border-8 border-background/50 backdrop-blur-sm">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
                alt="Students learning"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium border border-white/10">
                    {t('liveNow')}
                  </div>
                  <div className="px-3 py-1 rounded-full bg-primary/80 text-white text-xs font-medium">
                    {t('category')}
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">{t('courseTitle')}</h3>
                <p className="text-white/80 line-clamp-2 mb-4">{t('courseDescription')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs">SC</div>
                    <span className="text-white text-sm font-medium">{t('instructor')}</span>
                  </div>
                  <Button size="sm" className="rounded-full bg-white text-black hover:bg-white/90 border-none">
                    {t('joinClass')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 -right-12 z-20"
            >
              <GlassCard className="p-4 flex items-center gap-3 !bg-white/90 dark:!bg-black/80 backdrop-blur-xl border-none shadow-xl rounded-2xl">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">{t('completed')}</div>
                  <div className="text-xs text-muted-foreground">{t('xpEarned')}</div>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-20 -left-12 z-20"
            >
              <GlassCard className="p-4 flex items-center gap-3 !bg-white/90 dark:!bg-black/80 backdrop-blur-xl border-none shadow-xl rounded-2xl">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-white dark:border-black overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i + 5}`} />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-bold">{t('peers')}</div>
                  <div className="text-xs text-muted-foreground">{t('learningWithYou')}</div>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
