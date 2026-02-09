'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { communityApi } from '@/lib/api/community';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Calendar, CheckCircle, GraduationCap, MessageCircle, Radio, Users2 } from 'lucide-react';
import { enrollmentApi } from '@/lib/api';
import apiClient from '@/lib/api/client';

interface CourseInstructor {
  id: string;
  isPrimary: boolean;
  user: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
}

interface CourseSection {
  id: string;
  title: string;
  description?: string | null;
  lessons: Array<{
    id: string;
    title: string;
    isFreePreview?: boolean;
  }>;
}

interface CourseDetail {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  coverImageUrl?: string | null;
  language: string;
  level: string;
  pricingModel: string;
  price?: number | null;
  category?: { id: string; name: string; slug: string } | null;
  instructors: CourseInstructor[];
  sections: CourseSection[];
  _count?: { enrollments?: number };
}

interface CourseStream {
  id: string;
  title: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  scheduledAt?: string | null;
  endedAt?: string | null;
  viewerCount: number;
  instructor: { id: string; name: string; avatarUrl?: string | null };
  _count?: { viewers: number };
}

const formatEnum = (value?: string | null, t?: any) => {
  if (!value) return 'N/A';
  if (t) {
    return t(`levels.${value}`);
  }
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export default function CourseDetailPage() {
  const t = useTranslations('course_details');
  const tCourses = useTranslations('courses');
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const { user, isLoading: isAuthLoading } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [progressMap, setProgressMap] = useState<Map<string, { completed: boolean }>>(new Map());
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [upcomingStreams, setUpcomingStreams] = useState<CourseStream[]>([]);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    const loadCourse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await communityApi.getCourseBySlug(slug);
        if (isMounted) {
          setCourse(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load course.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!user || !course) return;
    let cancelled = false;

    const loadProgress = async () => {
      try {
        const data = await enrollmentApi.getProgress(course.id);
        if (cancelled) return;
        if (data?.enrollment) setEnrolled(true);
        const map = new Map<string, { completed: boolean }>();
        data?.sections?.forEach((s: any) => {
          s.lessons?.forEach((l: any) => {
            map.set(l.id, { completed: l.completed });
          });
        });
        setProgressMap(map);
      } catch {
        // Not enrolled or no progress yet
      }
    };

    loadProgress();
    return () => { cancelled = true; };
  }, [user, course]);

  // Fetch upcoming/live streams for this course
  useEffect(() => {
    if (!course) return;
    let cancelled = false;

    const loadStreams = async () => {
      try {
        const { data } = await apiClient.get(`/streaming/course/${course.id}/upcoming`);
        if (!cancelled && data?.data) {
          setUpcomingStreams(data.data);
        }
      } catch {
        // Streaming data is optional — fail silently
      }
    };

    loadStreams();
    return () => { cancelled = true; };
  }, [course]);

  const handleEnroll = async () => {
    if (!course) return;
    setIsEnrolling(true);
    try {
      await enrollmentApi.enroll(course.id);
      setEnrolled(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to enroll.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const totalLessons = useMemo(
    () => course?.sections?.reduce((total, section) => total + (section.lessons?.length || 0), 0) ?? 0,
    [course],
  );
  const totalSections = course?.sections?.length ?? 0;
  const enrollments = course?._count?.enrollments ?? 0;

  if (isLoading || isAuthLoading) {
    return (
      <div className="container py-12 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('na')}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('na')}</CardTitle>
            <CardDescription>{t('na')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative border-b overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="container relative grid gap-10 py-12 lg:grid-cols-[1.3fr_0.7fr] lg:py-16">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{course.category?.name || 'General'}</Badge>
              <Badge variant="outline">{formatEnum(course.level, tCourses)}</Badge>
              <Badge variant="outline">{course.language.toUpperCase()}</Badge>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
              <p className="text-lg text-muted-foreground">
                {course.description || t('description_placeholder')}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                {t('sections_count', { count: totalSections })}, {t('lessons_count', { count: totalLessons })}
              </div>
              <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4 text-primary" />
                {t('enrolled_count', { count: enrollments })}
              </div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                {course.pricingModel === 'FREE' ? t('free') : course.price ? `$${course.price}` : t('paid')}
              </div>
            </div>

            {course.instructors.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{t('instructors')}</p>
                <div className="flex flex-wrap gap-3">
                  {course.instructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center gap-3 rounded-full border bg-background/80 px-3 py-2"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {getInitials(instructor.user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{instructor.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {instructor.isPrimary ? t('lead_instructor') : t('instructor')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Card className="h-fit border-primary/20 bg-background/80 shadow-lg">
            <CardHeader>
              <CardTitle>{t('access_title')}</CardTitle>
              <CardDescription>
                {enrolled
                  ? t('access_enrolled')
                  : course.pricingModel === 'FREE'
                    ? t('access_free_desc')
                    : t('access_paid_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && !enrolled && (
                <>
                  {course.pricingModel === 'FREE' ? (
                    <Button className="w-full" onClick={handleEnroll} disabled={isEnrolling}>
                      {isEnrolling ? t('enrolling') : t('enroll_free')}
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href={`/checkout/${course.id}`}>{t('subscribe_access')}</Link>
                    </Button>
                  )}
                </>
              )}
              {!user && (
                <Button asChild className="w-full">
                  <Link href="/login">{t('sign_in')}</Link>
                </Button>
              )}
              {enrolled && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('progress')}</span>
                  <span className="font-medium">
                    {t('completed_fraction', { completed: Array.from(progressMap.values()).filter((l) => l.completed).length, total: progressMap.size })}
                  </span>
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/courses/${course.slug}/community`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {user ? t('enter_community') : t('view_community')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="#syllabus">{t('view_syllabus')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Live & Upcoming Sessions */}
      {upcomingStreams.length > 0 && (
        <section className="container py-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-red-500" />
            {upcomingStreams.some((s) => s.status === 'LIVE')
              ? t('live_now')
              : t('upcoming_sessions')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingStreams.map((stream) => (
              <Card key={stream.id} className={stream.status === 'LIVE' ? 'border-red-500/50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{stream.title}</CardTitle>
                    {stream.status === 'LIVE' && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        {t('live_now')}
                      </Badge>
                    )}
                  </div>
                  {stream.instructor && (
                    <CardDescription className="text-xs">
                      {stream.instructor.name}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  {stream.scheduledAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(stream.scheduledAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                  {stream.status === 'LIVE' && enrolled ? (
                    <Button size="sm" variant="destructive" asChild>
                      <Link href={`/streaming/${stream.id}`}>{t('join_live')}</Link>
                    </Button>
                  ) : stream.status === 'LIVE' ? (
                    <Badge variant="outline" className="text-xs">
                      {t('viewers_count', { count: stream.viewerCount })}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section id="syllabus" className="container grid gap-8 py-12 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">{t('syllabus_title')}</h2>
            <p className="text-muted-foreground">
              {t('syllabus_desc')}
            </p>
          </div>

          <div className="space-y-4">
            {course.sections.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('no_sections_title')}</CardTitle>
                  <CardDescription>{t('no_sections_desc')}</CardDescription>
                </CardHeader>
              </Card>
            ) : (
              course.sections.map((section, index) => (
                <Card key={section.id} className="border-border/60">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {index + 1}. {section.title}
                      </CardTitle>
                      <Badge variant="outline">{t('lessons_count', { count: section.lessons.length })}</Badge>
                    </div>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {section.lessons.map((lesson) => {
                        const lessonProgress = progressMap.get(lesson.id);
                        const canAccess = enrolled || lesson.isFreePreview;
                        return (
                          <li key={lesson.id} className="flex items-center gap-2">
                            {lessonProgress?.completed ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                            )}
                            {canAccess && user ? (
                              <Link
                                href={`/courses/${course.slug}/lessons/${lesson.id}`}
                                className="text-primary hover:underline"
                              >
                                {lesson.title}
                              </Link>
                            ) : (
                              <span className={enrolled ? 'text-foreground' : 'text-muted-foreground'}>
                                {lesson.title}
                              </span>
                            )}
                            {lesson.isFreePreview && (
                              <Badge variant="secondary" className="text-xs">{t('preview')}</Badge>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('community_focus_title')}</CardTitle>
              <CardDescription>{t('community_focus_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t('community_point_1')}</p>
              <p>{t('community_point_2')}</p>
              <p>{t('community_point_3')}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/courses/${course.slug}/community`}>{t('go_to_community')}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
