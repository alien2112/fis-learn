'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BilingualHeading, BilingualInline } from '@/components/ui/bilingual-text';
import { PlayCircle, BookOpen, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

const rtfEn = new Intl.RelativeTimeFormat('en', { numeric: 'always' });
const rtfAr = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'always' });

type RelativeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

function getRelativeTimeValueAndUnit(date: Date): { value: number; unit: RelativeUnit } {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return { value: diffSeconds, unit: 'second' };

  const diffMinutes = Math.round(diffSeconds / 60);
  const absMinutes = Math.abs(diffMinutes);
  if (absMinutes < 60) return { value: diffMinutes, unit: 'minute' };

  const diffHours = Math.round(diffMinutes / 60);
  const absHours = Math.abs(diffHours);
  if (absHours < 24) return { value: diffHours, unit: 'hour' };

  const diffDays = Math.round(diffHours / 24);
  const absDays = Math.abs(diffDays);
  if (absDays < 7) return { value: diffDays, unit: 'day' };

  const diffWeeks = Math.round(diffDays / 7);
  const absWeeks = Math.abs(diffWeeks);
  if (absWeeks < 4) return { value: diffWeeks, unit: 'week' };

  const diffMonths = Math.round(diffDays / 30);
  const absMonths = Math.abs(diffMonths);
  if (absMonths < 12) return { value: diffMonths, unit: 'month' };

  const diffYears = Math.round(diffDays / 365);
  return { value: diffYears, unit: 'year' };
}

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

const ENROLLMENT_STATUS_LABELS: Record<
  StudentStats['recentEnrollments'][number]['status'],
  { en: string; ar: string }
> = {
  ACTIVE: { en: 'Active', ar: 'شغّال' },
  COMPLETED: { en: 'Completed', ar: 'مخلّص' },
  DROPPED: { en: 'Dropped', ar: 'سايبُه' },
};

export default function StudentDashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

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
          const message = payload?.message || payload?.error || 'Unable to load dashboard.';
          throw new Error(Array.isArray(message) ? message.join(', ') : message);
        }
        setStats(payload?.data || null);
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : 'Unable to load dashboard.');
      } finally {
        setIsStatsLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>
              <BilingualHeading ar="لازم تسجّل دخول" en="Sign in required" />
            </CardTitle>
            <CardDescription>
              <BilingualHeading
                ar="لازم تكون مسجّل دخول عشان تشوف الداشبورد بتاعتك."
                en="You must be logged in to view your dashboard."
              />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">
                <BilingualInline ar="سجّل دخولك" en="Log In" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <BilingualHeading
              ar={<>أهلا بيك تاني، {user.name}</>}
              en={<>Welcome back, {user.name}</>}
              className="leading-tight"
            />
          </h1>
          <p className="text-muted-foreground">
            <BilingualHeading
              ar="تابع تقدّمك في التعلّم وآخر نشاطاتك."
              en="Track your learning progress and recent activity."
              className="leading-tight"
            />
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/courses">
            <BilingualInline ar="تصفّح الكورسات" en="Browse courses" />
          </Link>
        </Button>
      </div>

      {statsError ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <BilingualHeading ar="الداشبورد مش متاحة دلوقتي" en="Dashboard unavailable" />
            </CardTitle>
            <CardDescription>{statsError}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={
                <BilingualHeading
                  ar="إجمالي التسجيلات"
                  en="Total Enrollments"
                  className="leading-tight"
                />
              }
              value={stats?.enrollments.total}
              isLoading={isStatsLoading}
            />
            <StatCard
              title={
                <BilingualHeading
                  ar="الكورسات الشغّالة"
                  en="Active Courses"
                  className="leading-tight"
                />
              }
              value={stats?.enrollments.active}
              isLoading={isStatsLoading}
            />
            <StatCard
              title={
                <BilingualHeading
                  ar="الكورسات اللي خلّصتها"
                  en="Completed Courses"
                  className="leading-tight"
                />
              }
              value={stats?.enrollments.completed}
              isLoading={isStatsLoading}
            />
            <StatCard
              title={
                <BilingualHeading
                  ar="متوسط التقدّم"
                  en="Average Progress"
                  className="leading-tight"
                />
              }
              value={
                typeof stats?.enrollments.averageProgress === 'number'
                  ? `${stats.enrollments.averageProgress.toFixed(1)}%`
                  : undefined
              }
              isLoading={isStatsLoading}
            />
          </div>

          {/* Continue Learning Section */}
          {!isStatsLoading && stats?.recentEnrollments && stats.recentEnrollments.length > 0 && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    <BilingualHeading ar="كمّل التعلّم" en="Continue Learning" className="leading-tight" />
                  </CardTitle>
                  <CardDescription>
                    <BilingualHeading ar="كمّل من حيث وقفت" en="Pick up where you left off" />
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const activeEnrollments = stats.recentEnrollments.filter(
                      (e) => e.status === 'ACTIVE'
                    );
                    const topEnrollment = activeEnrollments[0];
                    if (!topEnrollment) return (
                      <p className="text-sm text-muted-foreground">
                        <BilingualHeading
                          ar="مفيش كورسات شغّالة دلوقتي. ابدأ اتعلّم!"
                          en="No active courses. Start learning!"
                        />
                      </p>
                    );

                    const topProgress = Math.round(topEnrollment.progressPercent);
                    return (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{topEnrollment.course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            <BilingualInline
                              en={`${topProgress}% complete`}
                              ar={`مخلّص ${topProgress}%`}
                            />
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/courses/${topEnrollment.course.slug}`}>
                          <BilingualInline ar="كمّل" en="Resume" />
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  <BilingualHeading ar="آخر التسجيلات" en="Recent Enrollments" className="leading-tight" />
                </CardTitle>
                <CardDescription>
                  <BilingualHeading ar="آخر كورسات انضمّيت لها." en="Latest courses you joined." />
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-courses">
                  <BilingualInline ar="شوف الكل" en="View All" />
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stats?.recentEnrollments?.length ? (
                <div className="space-y-4">
                  {stats.recentEnrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{enrollment.course.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const enrolledAt = new Date(enrollment.enrolledAt);
                            const { value, unit } = getRelativeTimeValueAndUnit(enrolledAt);
                            return (
                              <BilingualInline
                                ar={`اتسجّلت ${rtfAr.format(value, unit)}`}
                                en={`Enrolled ${rtfEn.format(value, unit)}`}
                              />
                            );
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/courses/${enrollment.course.slug}/community`}>
                            <BilingualInline ar="الكوميونيتي" en="Community" />
                          </Link>
                        </Button>
                        <Badge variant={enrollment.status === 'COMPLETED' ? 'secondary' : 'outline'}>
                          <BilingualInline
                            ar={ENROLLMENT_STATUS_LABELS[enrollment.status].ar}
                            en={ENROLLMENT_STATUS_LABELS[enrollment.status].en}
                          />
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(enrollment.progressPercent)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <BilingualHeading ar="مفيش تسجيلات لسه." en="No enrollments yet." />
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  isLoading,
}: {
  title: ReactNode;
  value?: ReactNode;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-semibold">
            {value ?? <BilingualInline ar="مش متاح" en="N/A" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
