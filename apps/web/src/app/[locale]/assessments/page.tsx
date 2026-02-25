'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Code2, CheckCircle, XCircle, Clock, ArrowRight, Award, TrendingUp, Filter, BookOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const t = useTranslations('assessments');
  const locale = useLocale();
  const isRTL = locale === 'ar';
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
          throw new Error(payload?.message || t('error'));
        }
        setSubmissions(payload?.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSubmissions();
  }, [user, t]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="container py-12 space-y-8">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 border-dashed shadow-none bg-muted/20">
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border text-primary">
            <Award className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl mb-2">{t('title')}</CardTitle>
          <CardDescription className="mb-6 text-base">{t('noAssessmentsDesc')}</CardDescription>
          <Button asChild size="lg" className="rounded-full w-full shadow-lg shadow-primary/20">
            <Link href="/login">Log In</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return (
          <div className="p-3 bg-green-500/10 rounded-2xl ring-1 ring-green-500/20">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        );
      case 'WRONG_ANSWER':
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
        return (
          <div className="p-3 bg-red-500/10 rounded-2xl ring-1 ring-red-500/20">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
        );
      default:
        return (
          <div className="p-3 bg-muted rounded-2xl ring-1 ring-border/50">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <Badge variant="success" className="rounded-lg font-black uppercase tracking-widest text-[9px] px-3 py-1 shadow-sm">{t('status.PASSED')}</Badge>;
      case 'WRONG_ANSWER':
      case 'COMPILATION_ERROR':
      case 'RUNTIME_ERROR':
        return <Badge variant="destructive" className="rounded-lg font-black uppercase tracking-widest text-[9px] px-3 py-1 shadow-sm">{t('status.FAILED')}</Badge>;
      default:
        return <Badge variant="outline" className="rounded-lg font-black uppercase tracking-widest text-[9px] px-3 py-1 shadow-sm">{t('status.PENDING')}</Badge>;
    }
  };

  const statsData = {
    total: submissions.length,
    passed: submissions.filter((s) => s.status === 'ACCEPTED').length,
    rate: submissions.length > 0
      ? Math.round((submissions.filter((s) => s.status === 'ACCEPTED').length / submissions.length) * 100)
      : 0
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Header */}
      <section className="bg-primary/5 py-12 md:py-16 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.6 }}
          >
            <div className="flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-xs mb-4">
              <Code2 className="w-4 h-4" />
              Progress Tracker
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-3 leading-none">{t('title')}</h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl font-medium">
              {t('subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container px-4">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {[
            { label: t('stats.total'), value: statsData.total, icon: Code2, color: "blue" },
            { label: t('stats.passed'), value: statsData.passed, icon: Award, color: "green" },
            { label: t('stats.rate'), value: `${statsData.rate}%`, icon: TrendingUp, color: "purple" }
          ].map((item, i) => (
            <motion.div 
              key={item.label}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-[2rem] overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-6">
                  <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-widest">{item.label}</CardTitle>
                  <div className={cn(
                    "p-2.5 rounded-2xl transition-colors duration-300",
                    item.color === "blue" ? "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white" :
                    item.color === "green" ? "bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white" :
                    "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white"
                  )}>
                    <item.icon className="w-4 h-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className={cn(
                    "text-4xl font-black tracking-tighter",
                    item.color === "green" && statsData.passed > 0 ? "text-green-600 dark:text-green-400" : ""
                  )}>{item.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {error ? (
          <Card className="border-destructive/20 bg-destructive/5 text-center py-16 rounded-[2.5rem]">
            <CardHeader>
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 text-destructive">
                <XCircle className="w-10 h-10" />
              </div>
              <CardTitle className="text-destructive font-black text-3xl mb-2">{t('error')}</CardTitle>
              <CardDescription className="text-lg font-bold">{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : submissions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-24 border-2 border-dashed rounded-[3rem] bg-muted/10 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-background rounded-[2rem] flex items-center justify-center mb-8 shadow-xl border border-border/50">
              <Award className="w-12 h-12 text-primary opacity-40" />
            </div>
            <h3 className="text-3xl font-black mb-3">{t('noAssessments')}</h3>
            <p className="text-muted-foreground mb-10 text-lg max-w-md mx-auto font-medium">
              {t('noAssessmentsDesc')}
            </p>
            <Button asChild size="lg" className="rounded-full px-12 h-14 text-md font-bold shadow-2xl shadow-primary/30 transition-all duration-300 hover:scale-105">
              <Link href="/my-courses">
                {t('goToCourses')}
                <ArrowRight className={cn("ml-2 h-5 w-5", isRTL && "rotate-180")} />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {submissions.map((submission, idx) => (
                <motion.div
                  key={submission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.23, 1, 0.32, 1] }}
                >
                  <Card className="group hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2.5rem] border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-8 gap-8">
                        <div className="flex items-start gap-6 min-w-0">
                          <div className="shrink-0 mt-1">{getStatusIcon(submission.status)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              {getStatusBadge(submission.status)}
                              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-lg">
                                {submission.exercise.difficulty}
                              </Badge>
                            </div>
                            <h3 className="font-black text-2xl md:text-3xl truncate group-hover:text-primary transition-colors duration-300 mb-2">{submission.exercise.title}</h3>
                            <p className="text-muted-foreground font-bold text-sm flex items-center gap-2 mb-4">
                              <span className="text-primary/80">{submission.exercise.lesson.section.course.title}</span>
                              <span className="opacity-30">/</span>
                              <span className="opacity-70">{submission.exercise.lesson.title}</span>
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl text-[11px] font-black uppercase tracking-wider text-muted-foreground ring-1 ring-border/50 shadow-sm">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDistanceToNow(new Date(submission.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center bg-muted/30 lg:bg-transparent -mx-8 -mb-8 lg:m-0 p-6 lg:p-0 border-t lg:border-t-0 border-border/50">
                          <div className="text-left lg:text-right">
                            <div className="text-3xl md:text-4xl font-black tracking-tighter leading-none mb-1">
                              {submission.pointsEarned} <span className="text-muted-foreground text-sm font-black uppercase tracking-widest opacity-50">/ {submission.pointsTotal} pts</span>
                            </div>
                            <div className="flex items-center lg:justify-end gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/80">
                              <TrendingUp className="w-3 h-3 text-primary" />
                              {t('card.tests', { passed: submission.testsPassed, total: submission.testsTotal })}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-primary/10 hover:text-primary" asChild>
                             <Link href={`/courses/${submission.exercise.lesson.section.course.slug}`}>
                                <ArrowRight className={cn("w-6 h-6", isRTL && "rotate-180")} />
                             </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
