'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { enrollmentsApi, Enrollment } from '@/lib/api/enrollments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, GraduationCap, PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DEFAULT_COURSE_IMAGE } from '@/lib/placeholder-images';

export default function MyCoursesPage() {
  const t = useTranslations('myCourses');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { user, isLoading: isAuthLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  useEffect(() => {
    if (!user) return;

    const loadEnrollments = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await enrollmentsApi.getMyEnrollments();
        setEnrollments(result.data);
      } catch (err) {
        setError(t('error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadEnrollments();
  }, [user, t]);

  const filteredEnrollments = useMemo(() => {
    if (filter === 'ALL') return enrollments;
    return enrollments.filter((e) => e.status === filter);
  }, [enrollments, filter]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12 space-y-8">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 border-dashed shadow-none bg-muted/20">
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl mb-2">{t('signInRequired')}</CardTitle>
          <CardDescription className="mb-6 text-base">{t('signInRequiredDesc')}</CardDescription>
          <Button asChild size="lg" className="rounded-full w-full shadow-lg shadow-primary/20">
            <Link href="/login">{t('filters.all') /* Fallback for Login string if not in namespace */ ? "Log In" : "Log In"}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="bg-primary/5 py-12 md:py-16 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container px-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">{t('title')}</h1>
              <p className="text-muted-foreground text-lg">
                {t('enrolledCount', { count: enrollments.length })}
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <Button variant="outline" asChild size="lg" className="rounded-full bg-background/50 backdrop-blur-sm border-2 font-bold shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300">
                <Link href="/courses">
                  {t('browseMore')}
                  <ArrowRight className={cn("ml-2 h-4 w-4", isRTL && "rotate-180")} />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="container px-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
            {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  "rounded-xl px-5 h-10 font-bold transition-all duration-300",
                  filter === f ? "shadow-lg shadow-primary/20" : "hover:bg-background/80"
                )}
                onClick={() => setFilter(f)}
              >
                {t(`filters.${f.toLowerCase()}`)}
                <span className={cn(
                  "ml-2 text-[10px] py-0.5 px-2 rounded-md font-black uppercase tracking-wider",
                  filter === f ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground"
                )}>
                  {f === 'ALL' ? enrollments.length : enrollments.filter((e) => e.status === f).length}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/20 bg-destructive/5 text-center py-12 rounded-[2rem]">
            <CardHeader>
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 text-destructive">
                <Clock className="w-8 h-8" />
              </div>
              <CardTitle className="text-destructive font-black text-2xl">{t('error')}</CardTitle>
              <CardDescription className="text-lg font-medium">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : filteredEnrollments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 border-2 border-dashed rounded-[2.5rem] bg-muted/10 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-background rounded-full flex items-center justify-center mb-6 shadow-sm border">
              <BookOpen className="w-10 h-10 text-muted-foreground opacity-30" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('noEnrollments')}</h3>
            <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto">
              {filter === 'ALL'
                ? ""
                : t('noFilteredEnrollments', { filter: t(`filters.${filter.toLowerCase()}`).toLowerCase() })}
            </p>
            <Button asChild size="lg" className="rounded-full px-10 shadow-xl shadow-primary/20">
              <Link href="/courses">{t('browseMore')}</Link>
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredEnrollments.map((enrollment, idx) => (
                <CourseCard key={enrollment.id} enrollment={enrollment} index={idx} t={t} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ enrollment, index, t }: { enrollment: Enrollment; index: number; t: any }) {
  const { course, stats, progressPercent, status } = enrollment;
  const primaryInstructor = course.instructors[0];
  const isRTL = useLocale() === 'ar';

  const getStatusBadge = () => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success" className="shadow-md rounded-md font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">{t('card.completed')}</Badge>;
      case 'DROPPED':
        return <Badge variant="destructive" className="shadow-md rounded-md font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">{t('card.dropped')}</Badge>;
      default:
        return <Badge variant="secondary" className="bg-background/90 backdrop-blur-md shadow-md rounded-md font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 border-none">{t('card.inProgress')}</Badge>;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      <Card className="flex flex-col h-full overflow-hidden hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 border-border/40 group relative rounded-[2rem]">
        {/* Cover Image */}
        <div className="aspect-video bg-muted relative overflow-hidden shrink-0">
          <img
            src={course.coverImageUrl ?? DEFAULT_COURSE_IMAGE}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-4 right-4 z-20">
            {getStatusBadge()}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
             <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-[10px] font-black border border-white/30">
                  {primaryInstructor?.name?.charAt(0) || 'I'}
                </div>
                <span className="text-xs font-bold truncate">{primaryInstructor?.name || t('card.instructor')}</span>
             </div>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <CardTitle className="text-xl md:text-2xl font-black line-clamp-2 leading-tight group-hover:text-primary transition-colors duration-300 mb-4 h-[3.5rem] flex items-start">
            {course.title}
          </CardTitle>

          <div className="mt-auto space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                <span className="text-muted-foreground">{t('card.progress')}</span>
                <span className="text-primary">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border/10 p-[1.5px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {t('card.lessonsCompleted', { completed: stats.completedLessons, total: stats.totalLessons })}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-primary/60" />
                {formatDistanceToNow(new Date(stats.lastActivityAt), { addSuffix: true })}
              </div>
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.1em] px-2 py-0.5 rounded bg-muted/30 border-none text-muted-foreground/80">
                {course.level}
              </Badge>
            </div>

            <div className="pt-2">
              {status === 'COMPLETED' ? (
                <Button variant="outline" className="w-full rounded-2xl border-2 h-12 font-black text-sm uppercase tracking-wider hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300" asChild>
                  <Link href={`/courses/${course.slug}`}>
                    {t('card.review')}
                  </Link>
                </Button>
              ) : (
                <Button className="w-full rounded-2xl h-12 font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/10 hover:shadow-primary/30 transition-all duration-300 group/btn overflow-hidden relative" asChild>
                  <Link href={`/courses/${course.slug}`}>
                    <span className="relative z-10 flex items-center justify-center">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {t('card.continue')}
                      <ArrowRight className={cn("ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1.5", isRTL && "rotate-180 group-hover/btn:-translate-x-1.5")} />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-dark to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}