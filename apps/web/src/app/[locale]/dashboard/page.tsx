'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle,
  BookOpen,
  ArrowRight,
  Trophy,
  Clock,
  LayoutDashboard,
  Users,
  TrendingUp,
  Search
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DEFAULT_COURSE_IMAGE } from '@/lib/placeholder-images';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

interface StudentStats {
  enrollments: {
    total: number;
    active: number;
    completed: number;
    dropped: number;
    averageProgress: number;
  };
  recentEnrollments: Array<{
    id: string;
    status: 'ACTIVE' | 'COMPLETED' | 'DROPPED';
    progressPercent: number;
    enrolledAt: string;
    completedAt?: string | null;
    course: {
      id: string;
      title: string;
      slug: string;
      coverImageUrl?: string | null;
      level: string;
    };
  }>;
}

export default function StudentDashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const { user, isLoading: isAuthLoading } = useAuth();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale === 'ar' ? 'ar-EG' : 'en', { numeric: 'auto' }), [locale]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadStats = async () => {
      setIsStatsLoading(true);
      setStatsError(null);
      try {
        const response = await fetch(`${API_URL}/dashboard/student-stats`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok) {
          const message = payload?.message || payload?.error || t('error.title');
          throw new Error(Array.isArray(message) ? message.join(', ') : message);
        }
        setStats(payload?.data || null);
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : t('error.title'));
      } finally {
        setIsStatsLoading(false);
      }
    };

    loadStats();
  }, [user, t]);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);

    if (absSeconds < 60) return rtf.format(diffSeconds, 'second');
    
    const diffMinutes = Math.round(diffSeconds / 60);
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
    
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    
    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) return rtf.format(diffDays, 'day');
    
    const diffWeeks = Math.round(diffDays / 7);
    if (Math.abs(diffWeeks) < 4) return rtf.format(diffWeeks, 'week');
    
    const diffMonths = Math.round(diffDays / 30);
    if (Math.abs(diffMonths) < 12) return rtf.format(diffMonths, 'month');
    
    const diffYears = Math.round(diffDays / 365);
    return rtf.format(diffYears, 'year');
  };

  if (isAuthLoading) {
    return (
      <div className="container py-12 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-24">
        <Card className="max-w-md mx-auto text-center p-8 border-dashed">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">{t('error.signinRequired')}</CardTitle>
            <CardDescription className="text-lg">
              {t('error.signinRequiredDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Button asChild size="lg" className="w-full rounded-full">
              <Link href="/login">{t('error.login')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeEnrollments = stats?.recentEnrollments.filter(e => e.status === 'ACTIVE') || [];
  const topEnrollment = activeEnrollments[0];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Header */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24 bg-primary/5">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />
        
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
                {t('welcome', { name: user.name })}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                <Link href="/courses">
                  <Search className="w-4 h-4 mr-2" />
                  {t('browseCourses')}
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container px-4 -mt-12 relative z-10 space-y-10">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('stats.totalEnrollments')}
            value={stats?.enrollments.total}
            icon={BookOpen}
            color="blue"
            isLoading={isStatsLoading}
            index={0}
          />
          <StatCard
            title={t('stats.activeCourses')}
            value={stats?.enrollments.active}
            icon={PlayCircle}
            color="orange"
            isLoading={isStatsLoading}
            index={1}
          />
          <StatCard
            title={t('stats.completedCourses')}
            value={stats?.enrollments.completed}
            icon={Trophy}
            color="green"
            isLoading={isStatsLoading}
            index={2}
          />
          <StatCard
            title={t('stats.averageProgress')}
            value={typeof stats?.enrollments.averageProgress === 'number' ? `${Math.round(stats.enrollments.averageProgress)}%` : undefined}
            icon={TrendingUp}
            color="purple"
            isLoading={isStatsLoading}
            index={3}
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Continue Learning */}
            {topEnrollment && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="overflow-hidden border-primary/20 shadow-xl shadow-primary/5 group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BookOpen className="w-32 h-32 rotate-12" />
                  </div>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs mb-2">
                      <Clock className="w-4 h-4" />
                      {t('continueLearning.title')}
                    </div>
                    <CardTitle className="text-2xl md:text-3xl font-bold">
                      {topEnrollment.course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>{t('continueLearning.progress', { percent: Math.round(topEnrollment.progressPercent) })}</span>
                          <span className="text-muted-foreground">{Math.round(topEnrollment.progressPercent)}%</span>
                        </div>
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${topEnrollment.progressPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                      <Button asChild size="lg" className="rounded-xl w-full sm:w-auto px-8 group-hover:translate-x-1 transition-transform">
                        <Link href={`/courses/${topEnrollment.course.slug}`}>
                          {t('continueLearning.resume')}
                          <ArrowRight className={cn("w-4 h-4 ml-2", isRTL && "rotate-180")} />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recent Enrollments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 flex flex-row items-end justify-between mb-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">{t('recentEnrollments.title')}</CardTitle>
                    <CardDescription>{t('recentEnrollments.subtitle')}</CardDescription>
                  </div>
                  <Button variant="ghost" asChild className="rounded-full">
                    <Link href="/my-courses">
                      {t('recentEnrollments.viewAll')}
                      <ArrowRight className={cn("w-4 h-4 ml-2", isRTL && "rotate-180")} />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="px-0">
                  {isStatsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : stats?.recentEnrollments?.length ? (
                    <div className="grid gap-4">
                      {stats.recentEnrollments.map((enrollment, idx) => (
                        <motion.div
                          key={enrollment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + idx * 0.1 }}
                          className="flex items-center gap-4 p-4 rounded-2xl border bg-card hover:border-primary/30 hover:shadow-md transition-all group"
                        >
                          <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                            <img
                              src={enrollment.course.coverImageUrl ?? DEFAULT_COURSE_IMAGE}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{enrollment.course.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatRelativeTime(enrollment.enrolledAt)}
                              </span>
                              <Badge variant={enrollment.status === 'COMPLETED' ? 'success' : 'outline'} className="text-[10px] py-0 h-5">
                                {t(`recentEnrollments.status.${enrollment.status}`)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm font-bold text-primary">{Math.round(enrollment.progressPercent)}%</div>
                            <Button size="sm" variant="ghost" asChild className="h-8 rounded-lg px-3">
                              <Link href={`/courses/${enrollment.course.slug}/community`}>
                                {t('recentEnrollments.community')}
                              </Link>
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-3xl">
                      <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground font-medium">{t('recentEnrollments.noEnrollments')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            {/* Quick Profile */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-gradient-to-br from-secondary/50 to-background border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-black shadow-xl shadow-primary/20">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl leading-none mb-1">{user.name}</h3>
                      <p className="text-sm text-muted-foreground truncate max-w-[180px]">{user.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 rounded-xl border-2" asChild>
                    <Link href="/settings">{t('sidebar.settings')}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Platform Stats / Community Activity */}
            <Card className="border-none shadow-md overflow-hidden bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {t('community.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded-xl">
                  {t('community.comingSoon')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  isLoading,
  index
}: {
  title: string;
  value?: string | number;
  icon: any;
  color: 'blue' | 'orange' | 'green' | 'purple';
  isLoading: boolean;
  index: number;
}) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index }}
    >
      <Card className="hover:border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className={cn("p-2 rounded-xl transition-colors", colorMap[color])}>
            <Icon className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-3xl font-black tracking-tight">
              {value ?? '—'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

