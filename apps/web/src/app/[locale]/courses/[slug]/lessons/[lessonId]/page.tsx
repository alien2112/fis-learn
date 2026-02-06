'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { enrollmentApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, PlayCircle, FileText, Code } from 'lucide-react';

interface Material {
  id: string;
  type: string;
  title: string;
  fileUrl?: string | null;
  videoAssetId?: string | null;
  youtubeUrl?: string | null;
}

interface CodeExercise {
  id: string;
  title: string;
  description: string;
  languageId: string;
  starterCode?: string | null;
  hints: string[] | null;
  difficulty: string;
  points: number;
}

interface LessonContent {
  id: string;
  title: string;
  description?: string | null;
  contentType: string;
  isFreePreview: boolean;
  material?: Material | null;
  codeExercises: CodeExercise[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string);
  const lessonId = Array.isArray(params?.lessonId) ? params.lessonId[0] : (params?.lessonId as string);
  const { user, isLoading: isAuthLoading } = useAuth();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState('');
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (!slug || !lessonId || isAuthLoading || !user) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const courseRes = await apiClient.get(`/courses/slug/${slug}`);
        const course = courseRes.data.data;
        if (cancelled) return;
        setCourseId(course.id);

        const lessonRes = await apiClient.get(`/courses/${course.id}/lessons/${lessonId}`);
        if (cancelled) return;
        setLesson(lessonRes.data.data);

        // Check completion status
        const progressRes = await apiClient.get(`/courses/${course.id}/progress`);
        if (cancelled) return;
        const lessonStatus = progressRes.data.data?.sections
          ?.flatMap((s: any) => s.lessons)
          ?.find((l: any) => l.id === lessonId);
        if (lessonStatus?.completed) setIsCompleted(true);

        // Seed code editor with first exercise
        if (lessonRes.data.data?.codeExercises?.length > 0) {
          const exercise = lessonRes.data.data.codeExercises[0];
          setSelectedExerciseId(exercise.id);
          setCodeValue(exercise.starterCode || '');
        }
      } catch (err: any) {
        if (!cancelled) {
          if (err?.response?.status === 403) {
            setError('access_denied');
          } else {
            setError(err?.response?.data?.message || 'Failed to load lesson.');
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [slug, lessonId, isAuthLoading, user]);

  const handleMarkComplete = async () => {
    if (!courseId || !lessonId || isCompleted) return;
    setIsCompleting(true);
    try {
      await enrollmentApi.completeLesson(courseId, lessonId);
      setIsCompleted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to mark as complete.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!selectedExerciseId) return;
    setIsSubmittingCode(true);
    setSubmissionResult(null);
    try {
      const response = await apiClient.post(`/code-exercises/${selectedExerciseId}/submit`, {
        code: codeValue,
      });
      setSubmissionResult(response.data.data);
    } catch (err: any) {
      setSubmissionResult({ error: err?.response?.data?.message || 'Submission failed.' });
    } finally {
      setIsSubmittingCode(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <div className="container py-12 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error === 'access_denied') {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Subscription required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Subscribe to access this lesson and all paid course content.
            </p>
            <Button asChild className="w-full">
              <Link href={courseId ? `/checkout/${courseId}` : '/checkout'}>Subscribe</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/courses/${slug}`}>Back to course</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error || 'Lesson not found.'}</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href={`/courses/${slug}`}>Back to course</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedExercise = lesson.codeExercises?.find((e) => e.id === selectedExerciseId);

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb header */}
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container flex items-center justify-between py-3 max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/courses/${slug}`} className="text-muted-foreground hover:text-foreground transition-colors">
              Course
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium truncate max-w-[200px]">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {lesson.isFreePreview && <Badge variant="secondary">Free Preview</Badge>}
            {isCompleted ? (
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Completed
              </Badge>
            ) : (
              <Button size="sm" onClick={handleMarkComplete} disabled={isCompleting}>
                {isCompleting ? 'Saving…' : 'Mark Complete'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lesson body */}
      <div className="container py-8 max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {lesson.description && <p className="mt-2 text-muted-foreground">{lesson.description}</p>}
        </div>

        {/* Video */}
        {lesson.contentType === 'VIDEO' && lesson.material && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="h-5 w-5 text-primary" />
                Video Lesson
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lesson.material.youtubeUrl ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                  <iframe
                    src={lesson.material.youtubeUrl.replace('watch?v=', 'embed/')}
                    title={lesson.material.title}
                    className="w-full h-full"
                    allowFullScreen
                  />
                </div>
              ) : lesson.material.videoAssetId ? (
                <div className="aspect-video w-full rounded-lg bg-muted flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Secure video — asset {lesson.material.videoAssetId}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Video is being prepared…</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* PDF */}
        {lesson.contentType === 'PDF' && lesson.material?.fileUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                PDF Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <a href={lesson.material.fileUrl} target="_blank" rel="noopener noreferrer">
                  Download PDF
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Code exercises */}
        {lesson.codeExercises?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="h-5 w-5 text-primary" />
                Code Exercise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lesson.codeExercises.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {lesson.codeExercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => {
                        setSelectedExerciseId(exercise.id);
                        setCodeValue(exercise.starterCode || '');
                        setSubmissionResult(null);
                      }}
                      className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                        selectedExerciseId === exercise.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-muted hover:bg-muted'
                      }`}
                    >
                      {exercise.title}
                    </button>
                  ))}
                </div>
              )}

              {selectedExercise && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedExercise.difficulty}</Badge>
                    <Badge variant="outline">{selectedExercise.points} pts</Badge>
                    <Badge variant="outline">{selectedExercise.languageId}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedExercise.description}</p>

                  <div className="rounded-lg border">
                    <div className="border-b px-3 py-2 bg-muted/50">
                      <span className="text-xs font-medium text-muted-foreground">
                        {selectedExercise.languageId}
                      </span>
                    </div>
                    <textarea
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                      className="w-full min-h-[200px] p-3 font-mono text-sm bg-transparent resize-none focus:outline-none"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button onClick={handleSubmitCode} disabled={isSubmittingCode}>
                      {isSubmittingCode ? 'Running…' : 'Run & Submit'}
                    </Button>
                    {selectedExercise.hints && selectedExercise.hints.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">Hints</summary>
                        <ul className="mt-1 ml-4 list-disc text-muted-foreground">
                          {selectedExercise.hints.map((hint, i) => (
                            <li key={i}>{hint}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>

                  {submissionResult && (
                    <div
                      className={`rounded-lg border p-4 ${
                        submissionResult.error
                          ? 'border-destructive'
                          : submissionResult.status === 'ACCEPTED'
                            ? 'border-green-500 bg-green-50'
                            : 'border-muted'
                      }`}
                    >
                      {submissionResult.error ? (
                        <p className="text-sm text-destructive">{submissionResult.error}</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {submissionResult.status === 'ACCEPTED'
                              ? 'Accepted'
                              : (submissionResult.status || '').replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {submissionResult.testsPassed}/{submissionResult.testsTotal} tests passed
                          </p>
                          {submissionResult.stdout && (
                            <pre className="text-xs mt-2 p-2 bg-muted rounded">{submissionResult.stdout}</pre>
                          )}
                          {submissionResult.stderr && (
                            <pre className="text-xs mt-2 p-2 bg-destructive/10 rounded text-destructive">
                              {submissionResult.stderr}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
