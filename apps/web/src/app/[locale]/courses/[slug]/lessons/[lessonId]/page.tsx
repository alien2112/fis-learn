'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { enrollmentApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { LiveCodeEditor } from '@/components/code-editor';
import { VideoPlayer } from '@/components/video';
import { YouTubePlayer } from '@/components/video/YouTubePlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, PlayCircle, FileText, Code, ChevronLeft, ChevronRight, History, Terminal } from 'lucide-react';

interface Material {
  id: string;
  type: string;
  title: string;
  fileUrl?: string | null;
  videoAssetId?: string | null;
  youtubeUrl?: string | null;
}

interface TestCase {
  id: string;
  name?: string;
  input: string;
  expected: string;
  isHidden: boolean;
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
  testCases?: TestCase[];
}

interface CodeSubmission {
  id: string;
  status: string;
  testsPassed: number;
  testsTotal: number;
  pointsEarned: number;
  executionTime: number;
  memoryUsed: number;
  createdAt: string;
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

interface LessonNavigation {
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

// Map languageId from backend to LiveCodeEditor SupportedLanguage
const mapLanguage = (languageId: string): 'html' | 'css' | 'javascript' | 'python' | 'java' => {
  const mapping: Record<string, 'html' | 'css' | 'javascript' | 'python' | 'java'> = {
    'python': 'python',
    'javascript': 'javascript',
    'js': 'javascript',
    'java': 'java',
    'html': 'html',
    'css': 'css',
  };
  return mapping[languageId?.toLowerCase()] || 'javascript';
};

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
  const [navigation, setNavigation] = useState<LessonNavigation | null>(null);

  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<CodeExercise | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [submissions, setSubmissions] = useState<CodeSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

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

        // Get lesson content
        const lessonRes = await apiClient.get(`/courses/${course.id}/lessons/${lessonId}`);
        if (cancelled) return;
        const lessonData = lessonRes.data.data;
        setLesson(lessonData);

        // Check completion status
        const progressRes = await apiClient.get(`/courses/${course.id}/progress`);
        if (cancelled) return;
        const lessonStatus = progressRes.data.data?.sections
          ?.flatMap((s: any) => s.lessons)
          ?.find((l: any) => l.id === lessonId);
        if (lessonStatus?.completed) setIsCompleted(true);

        // Build navigation from course sections
        const allLessons = progressRes.data.data?.sections?.flatMap((s: any) => s.lessons) || [];
        const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
        setNavigation({
          previous: currentIndex > 0 ? { id: allLessons[currentIndex - 1].id, title: allLessons[currentIndex - 1].title } : null,
          next: currentIndex < allLessons.length - 1 ? { id: allLessons[currentIndex + 1].id, title: allLessons[currentIndex + 1].title } : null,
        });

        // Seed code editor with first exercise and fetch its details
        if (lessonData?.codeExercises?.length > 0) {
          const exercise = lessonData.codeExercises[0];
          setSelectedExerciseId(exercise.id);
          await fetchExerciseDetails(exercise.id);
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

  // Fetch exercise details including test cases
  const fetchExerciseDetails = async (exerciseId: string) => {
    try {
      const res = await apiClient.get(`/code-exercises/${exerciseId}`);
      setSelectedExercise(res.data.data);
    } catch (err) {
      console.error('Failed to fetch exercise details:', err);
    }
  };

  // Fetch submission history
  const fetchSubmissions = useCallback(async (exerciseId: string) => {
    setIsLoadingSubmissions(true);
    try {
      const res = await apiClient.get(`/code-exercises/${exerciseId}/my-submissions?limit=10`);
      setSubmissions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, []);

  // Load submissions when exercise changes
  useEffect(() => {
    if (selectedExerciseId) {
      fetchSubmissions(selectedExerciseId);
    }
  }, [selectedExerciseId, fetchSubmissions]);

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

  // Handle code execution (Run button)
  const handleRunCode = useCallback(async (code: string) => {
    if (!selectedExercise) {
      return { output: '', error: 'No exercise selected', executionTime: 0, status: 'error' as const };
    }

    try {
      const response = await apiClient.post('/code-execution/execute', {
        sourceCode: code,
        languageId: selectedExercise.languageId,
      });

      const result = response.data.data;
      const isSuccess = result.status === 'ACCEPTED' || (!result.stderr && result.stdout);
      return {
        output: result.stdout || '',
        error: result.stderr || null,
        executionTime: result.executionTime || 0,
        status: (isSuccess ? 'success' : 'error') as 'success' | 'error',
      };
    } catch (err: any) {
      return {
        output: '',
        error: err?.response?.data?.message || 'Execution failed',
        executionTime: 0,
        status: 'error' as const,
      };
    }
  }, [selectedExercise]);

  // Handle code submission (Submit button)
  const handleSubmitCode = useCallback(async (code: string) => {
    if (!selectedExerciseId) return;

    setIsSubmittingCode(true);
    setSubmissionResult(null);
    try {
      const response = await apiClient.post(`/code-exercises/${selectedExerciseId}/submit`, {
        code,
      });
      setSubmissionResult(response.data.data);
      // Refresh submissions after new submission
      await fetchSubmissions(selectedExerciseId);
    } catch (err: any) {
      setSubmissionResult({ error: err?.response?.data?.message || 'Submission failed.' });
    } finally {
      setIsSubmittingCode(false);
    }
  }, [selectedExerciseId, fetchSubmissions]);

  // Handle exercise selection
  const handleExerciseSelect = (exercise: CodeExercise) => {
    setSelectedExerciseId(exercise.id);
    setSubmissionResult(null);
    fetchExerciseDetails(exercise.id);
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
                <YouTubePlayer
                  youtubeUrl={lesson.material.youtubeUrl}
                  title={lesson.material.title}
                  lessonId={lessonId}
                  courseId={courseId || undefined}
                  onProgress={(percent) => {
                    // Auto-mark complete at 90% watched
                    if (percent >= 90 && !isCompleted) {
                      handleMarkComplete();
                    }
                  }}
                />
              ) : lesson.material.videoAssetId ? (
                <VideoPlayer
                  assetId={lesson.material.videoAssetId}
                  title={lesson.title}
                  onProgress={(percent) => {
                    // Auto-mark complete at 90% watched
                    if (percent >= 90 && !isCompleted) {
                      handleMarkComplete();
                    }
                  }}
                />
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
                      onClick={() => handleExerciseSelect(exercise)}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{selectedExercise.difficulty}</Badge>
                    <Badge variant="outline">{selectedExercise.points} pts</Badge>
                    <Badge variant="outline">{selectedExercise.languageId}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedExercise.description}</p>

                  {/* Test Cases Display */}
                  {selectedExercise.testCases && selectedExercise.testCases.length > 0 && (
                    <div className="rounded-lg border bg-muted/30">
                      <div className="border-b px-3 py-2 bg-muted/50">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Test Cases
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {selectedExercise.testCases.filter(tc => !tc.isHidden).map((tc, i) => (
                          <div key={tc.id || i} className="text-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Test {i + 1}:</span>
                              {tc.name && <span className="text-xs">{tc.name}</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-background rounded p-2">
                                <span className="text-muted-foreground">Input:</span>
                                <pre className="mt-1 font-mono">{tc.input}</pre>
                              </div>
                              <div className="bg-background rounded p-2">
                                <span className="text-muted-foreground">Expected:</span>
                                <pre className="mt-1 font-mono">{tc.expected}</pre>
                              </div>
                            </div>
                          </div>
                        ))}
                        {selectedExercise.testCases.filter(tc => tc.isHidden).length > 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            + {selectedExercise.testCases.filter(tc => tc.isHidden).length} hidden test cases
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live Code Editor */}
                  <LiveCodeEditor
                    initialCode={selectedExercise.starterCode || ''}
                    language={mapLanguage(selectedExercise.languageId)}
                    lessonId={lessonId}
                    exerciseId={selectedExercise.id}
                    onRun={handleRunCode}
                    onSubmit={handleSubmitCode}
                    readOnly={isSubmittingCode}
                  />

                  {/* Submission Result */}
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
                            {submissionResult.pointsEarned > 0 && ` • ${submissionResult.pointsEarned} points earned`}
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

                  {/* Submission History */}
                  <div className="rounded-lg border">
                    <div className="border-b px-3 py-2 bg-muted/50 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      <span className="text-sm font-medium">Submission History</span>
                    </div>
                    <div className="p-3">
                      {isLoadingSubmissions ? (
                        <div className="space-y-2">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ) : submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No submissions yet. Run and submit your code!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {submissions.map((sub) => (
                            <div
                              key={sub.id}
                              className={`flex items-center justify-between p-2 rounded text-sm ${
                                sub.status === 'ACCEPTED' ? 'bg-green-50' : 'bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={sub.status === 'ACCEPTED' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {sub.status.replace(/_/g, ' ')}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {sub.testsPassed}/{sub.testsTotal} tests
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {sub.pointsEarned > 0 && <span>{sub.pointsEarned} pts</span>}
                                <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

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
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lesson Navigation */}
        {navigation && (navigation.previous || navigation.next) && (
          <div className="flex items-center justify-between pt-4 border-t">
            {navigation.previous ? (
              <Button
                variant="outline"
                asChild
                className="flex items-center gap-2"
              >
                <Link href={`/courses/${slug}/lessons/${navigation.previous.id}`}>
                  <ChevronLeft className="h-4 w-4" />
                  <div className="text-left">
                    <div className="text-xs text-muted-foreground">Previous</div>
                    <div className="text-sm font-medium truncate max-w-[150px]">{navigation.previous.title}</div>
                  </div>
                </Link>
              </Button>
            ) : (
              <div />
            )}
            {navigation.next ? (
              <Button
                variant="outline"
                asChild
                className="flex items-center gap-2"
              >
                <Link href={`/courses/${slug}/lessons/${navigation.next.id}`}>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Next</div>
                    <div className="text-sm font-medium truncate max-w-[150px]">{navigation.next.title}</div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
