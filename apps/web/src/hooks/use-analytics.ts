'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';

interface AnalyticsEvent {
  eventType: string;
  timestamp: string;
  sessionId: string;
  courseId?: string;
  lessonId?: string;
  payload?: Record<string, any>;
}

// Generate or get session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export function useAnalytics() {
  const { user } = useAuth();
  const bufferRef = useRef<AnalyticsEvent[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionId = useRef<string>(getSessionId());

  // Flush events to API
  const flush = useCallback(async () => {
    if (bufferRef.current.length === 0 || !user) return;

    const events = [...bufferRef.current];
    bufferRef.current = [];

    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        // Put events back in buffer if failed
        bufferRef.current = [...events, ...bufferRef.current];
      }
    } catch (error) {
      // Put events back in buffer if failed
      bufferRef.current = [...events, ...bufferRef.current];
    }
  }, [user]);

  // Track event
  const track = useCallback(
    (
      eventType: string,
      data: { courseId?: string; lessonId?: string; payload?: Record<string, any> } = {}
    ) => {
      if (!user) return;

      const event: AnalyticsEvent = {
        eventType,
        timestamp: new Date().toISOString(),
        sessionId: sessionId.current,
        courseId: data.courseId,
        lessonId: data.lessonId,
        payload: data.payload,
      };

      bufferRef.current.push(event);

      // Flush immediately for important events
      if (
        ['LESSON_COMPLETE', 'VIDEO_COMPLETE', 'QUIZ_SUBMIT', 'ASSIGNMENT_SUBMIT'].includes(
          eventType
        )
      ) {
        flush();
      }
    },
    [user, flush]
  );

  // Track video progress
  const trackVideoProgress = useCallback(
    (
      videoId: string,
      courseId: string,
      lessonId: string,
      progress: {
        currentTime: number;
        duration: number;
        watchPct: number;
      }
    ) => {
      const isComplete = progress.watchPct >= 90;

      track(isComplete ? 'VIDEO_COMPLETE' : 'VIDEO_PLAY', {
        courseId,
        lessonId,
        payload: {
          videoId,
          currentTime: progress.currentTime,
          duration: progress.duration,
          watchPct: progress.watchPct,
          secondsWatched: Math.floor(progress.currentTime),
        },
      });
    },
    [track]
  );

  // Track lesson start/complete
  const trackLesson = useCallback(
    (
      action: 'start' | 'complete',
      courseId: string,
      lessonId: string,
      timeSpent?: number
    ) => {
      track(action === 'start' ? 'LESSON_START' : 'LESSON_COMPLETE', {
        courseId,
        lessonId,
        payload: timeSpent ? { timeSpent } : undefined,
      });
    },
    [track]
  );

  // Track quiz
  const trackQuiz = useCallback(
    (
      action: 'start' | 'submit',
      courseId: string,
      assessmentId: string,
      data?: {
        score?: number;
        maxScore?: number;
        isPassed?: boolean;
        timeSpent?: number;
        answers?: Record<string, any>;
      }
    ) => {
      track(action === 'start' ? 'QUIZ_START' : 'QUIZ_SUBMIT', {
        courseId,
        payload: {
          assessmentId,
          ...data,
        },
      });
    },
    [track]
  );

  // Track assignment
  const trackAssignment = useCallback(
    (
      action: 'start' | 'submit',
      courseId: string,
      assessmentId: string,
      data?: { timeSpent?: number }
    ) => {
      track(action === 'start' ? 'ASSIGNMENT_START' : 'ASSIGNMENT_SUBMIT', {
        courseId,
        payload: {
          assessmentId,
          ...data,
        },
      });
    },
    [track]
  );

  // Track course enrollment
  const trackCourseEnroll = useCallback(
    (courseId: string) => {
      track('COURSE_ENROLL', { courseId });
    },
    [track]
  );

  // Setup periodic flush
  useEffect(() => {
    if (!user) return;

    // Flush every 30 seconds
    flushIntervalRef.current = setInterval(flush, 30000);

    // Flush on page unload
    const handleBeforeUnload = () => {
      flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [user, flush]);

  return {
    track,
    trackVideoProgress,
    trackLesson,
    trackQuiz,
    trackAssignment,
    trackCourseEnroll,
    flush,
  };
}
