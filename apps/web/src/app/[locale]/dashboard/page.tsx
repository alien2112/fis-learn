'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, BookOpen, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api';

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
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You must be logged in to view your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Log In</Link>
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
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h1>
          <p className="text-muted-foreground">Track your learning progress and recent activity.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </div>

      {statsError ? (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard unavailable</CardTitle>
            <CardDescription>{statsError}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Enrollments"
              value={stats?.enrollments.total}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Active Courses"
              value={stats?.enrollments.active}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Completed Courses"
              value={stats?.enrollments.completed}
              isLoading={isStatsLoading}
            />
            <StatCard
              title="Average Progress"
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
                  Continue Learning
                </CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const activeEnrollments = stats.recentEnrollments.filter(
                    (e) => e.status === 'ACTIVE'
                  );
                  const topEnrollment = activeEnrollments[0];
                  if (!topEnrollment) return (
                    <p className="text-sm text-muted-foreground">No active courses. Start learning!</p>
                  );
                  return (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{topEnrollment.course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(topEnrollment.progressPercent)}% complete
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/courses/${topEnrollment.course.slug}`}>
                          Resume
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
                <CardTitle>Recent Enrollments</CardTitle>
                <CardDescription>Latest courses you joined.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-courses">
                  View All
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
                          Enrolled {formatDistanceToNow(new Date(enrollment.enrolledAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/courses/${enrollment.course.slug}/community`}>Community</Link>
                        </Button>
                        <Badge variant={enrollment.status === 'COMPLETED' ? 'secondary' : 'outline'}>
                          {enrollment.status.toLowerCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(enrollment.progressPercent)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
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
  title: string;
  value?: number | string;
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
          <div className="text-2xl font-semibold">{value ?? 'N/A'}</div>
        )}
      </CardContent>
    </Card>
  );
}
