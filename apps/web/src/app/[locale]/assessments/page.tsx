'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Code2, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CodeSubmission {
  id: string;
  status: string;
  pointsEarned: number;
  pointsTotal: number;
  testsPassed: number;
  testsTotal: number;
  createdAt: string;
  exercise: {
    id: string;
    title: string;
    difficulty: string;
    lesson: {
      id: string;
      title: string;
      section: {
        course: {
          id: string;
          title: string;
          slug: string;
        };
      };
    };
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';

export default function AssessmentsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadSubmissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/code-execution/submissions/my`, {
          credentials: 'include',
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.message || 'Failed to load submissions');
        }
        setSubmissions(payload?.data || []);
      } catch (err) {
        setError('Failed to load assessment history.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, [user]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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
            <CardDescription>You must be logged in to view assessments.</CardDescription>
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'WRONG_ANSWER':
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="secondary">Passed</Badge>;
      case 'WRONG_ANSWER':
        return <Badge variant="destructive">Wrong Answer</Badge>;
      case 'COMPILATION_ERROR':
        return <Badge variant="destructive">Compile Error</Badge>;
      case 'RUNTIME_ERROR':
        return <Badge variant="destructive">Runtime Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
        <p className="text-muted-foreground">
          Track your code exercise submissions and progress
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{submissions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">
              {submissions.filter((s) => s.status === 'ACCEPTED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {submissions.length > 0
                ? Math.round(
                    (submissions.filter((s) => s.status === 'ACCEPTED').length /
                      submissions.length) *
                      100
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No submissions yet</CardTitle>
            <CardDescription>
              Start working on code exercises in your courses to see your progress here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/my-courses">Go to My Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getStatusIcon(submission.status)}</div>
                    <div>
                      <h3 className="font-semibold">{submission.exercise.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {submission.exercise.lesson.section.course.title} •{' '}
                        {submission.exercise.lesson.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(submission.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {submission.exercise.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(submission.status)}
                    <p className="text-sm mt-2">
                      {submission.pointsEarned}/{submission.pointsTotal} points
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {submission.testsPassed}/{submission.testsTotal} tests
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
