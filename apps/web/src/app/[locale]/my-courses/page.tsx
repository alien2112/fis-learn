'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { enrollmentsApi, Enrollment } from '@/lib/api/enrollments';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, GraduationCap, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const formatEnumLabel = (value?: string | null) => {
  if (!value) return 'N/A';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export default function MyCoursesPage() {
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
        setError('Failed to load your courses.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEnrollments();
  }, [user]);

  const filteredEnrollments = useMemo(() => {
    if (filter === 'ALL') return enrollments;
    return enrollments.filter((e) => e.status === filter);
  }, [enrollments, filter]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
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
            <CardDescription>You must be logged in to view your courses.</CardDescription>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">
            {enrollments.length} course{enrollments.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/courses">Browse more courses</Link>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'ALL' ? 'All' : formatEnumLabel(f)}
            {f !== 'ALL' && (
              <span className="ml-2 text-xs opacity-70">
                ({enrollments.filter((e) => e.status === f).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : filteredEnrollments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No courses found</CardTitle>
            <CardDescription>
              {filter === 'ALL'
                ? "You haven't enrolled in any courses yet."
                : `No ${filter.toLowerCase()} courses.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/courses">Browse Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnrollments.map((enrollment) => (
            <CourseCard key={enrollment.id} enrollment={enrollment} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ enrollment }: { enrollment: Enrollment }) {
  const { course, stats, progressPercent, status, enrolledAt } = enrollment;
  const primaryInstructor = course.instructors[0];

  const getStatusBadge = () => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'DROPPED':
        return <Badge variant="destructive">Dropped</Badge>;
      default:
        return <Badge variant="outline">In Progress</Badge>;
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Cover Image */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {course.coverImageUrl ? (
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
            <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {getStatusBadge()}
        </div>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        </div>
        <CardDescription className="flex items-center gap-2">
          <GraduationCap className="h-3 w-3" />
          {primaryInstructor?.name || 'Instructor'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.completedLessons} of {stats.totalLessons} lessons completed
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(stats.lastActivityAt), { addSuffix: true })}
          </span>
          <span>{formatEnumLabel(course.level)}</span>
        </div>

        {/* Actions */}
        <div className="pt-2">
          {status === 'COMPLETED' ? (
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/courses/${course.slug}`}>Review Course</Link>
            </Button>
          ) : (
            <Button className="w-full" asChild>
              <Link href={`/courses/${course.slug}`}>
                <PlayCircle className="mr-2 h-4 w-4" />
                Continue Learning
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
