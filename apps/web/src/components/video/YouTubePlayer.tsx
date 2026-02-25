'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '@/lib/api/client';

interface YouTubePlayerProps {
  youtubeUrl: string;
  title?: string;
  lessonId?: string;
  courseId?: string;
  onProgress?: (percent: number) => void;
  autoPlay?: boolean;
  className?: string;
}

const PROGRESS_MILESTONES = [25, 50, 75, 90];

export function YouTubePlayer({
  youtubeUrl,
  title,
  lessonId,
  courseId,
  onProgress,
  autoPlay = false,
  className = '',
}: YouTubePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportedMilestonesRef = useRef<Set<number>>(new Set());
  const durationRef = useRef<number>(0);
  const onProgressRef = useRef(onProgress);
  const courseIdRef = useRef(courseId);
  const lessonIdRef = useRef(lessonId);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { courseIdRef.current = courseId; }, [courseId]);
  useEffect(() => { lessonIdRef.current = lessonId; }, [lessonId]);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = extractVideoId(youtubeUrl);

  const reportAnalyticsEvent = useCallback(
    async (eventType: string, payload: Record<string, unknown>) => {
      if (!courseIdRef.current || !lessonIdRef.current) return;
      try {
        await apiClient.post('/analytics/events', {
          events: [
            {
              eventType,
              courseId: courseIdRef.current,
              lessonId: lessonIdRef.current,
              timestamp: Date.now(),
              payload: { videoId, ...payload },
            },
          ],
        });
      } catch {
        // Silently fail analytics
      }
    },
    [videoId]
  );

  // Listen to YouTube postMessage events for progress tracking
  useEffect(() => {
    if (!videoId) return;

    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from YouTube
      if (!event.origin.includes('youtube.com')) return;

      let data: Record<string, unknown>;
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      // YouTube sends info events with current time and duration
      if (data.event === 'infoDelivery' && data.info) {
        const info = data.info as Record<string, unknown>;
        const currentTime = info.currentTime as number | undefined;
        const duration = info.duration as number | undefined;

        if (duration && duration > 0) durationRef.current = duration;

        if (currentTime !== undefined && durationRef.current > 0) {
          const percent = (currentTime / durationRef.current) * 100;

          PROGRESS_MILESTONES.forEach((milestone) => {
            if (percent >= milestone && !reportedMilestonesRef.current.has(milestone)) {
              reportedMilestonesRef.current.add(milestone);
              onProgressRef.current?.(milestone);
              reportAnalyticsEvent(milestone >= 90 ? 'VIDEO_COMPLETE' : 'VIDEO_PROGRESS', {
                watchPct: milestone,
                secondsWatched: Math.round(currentTime),
                duration: Math.round(durationRef.current),
              });
            }
          });
        }
      }

      if (data.event === 'video-ended') {
        onProgressRef.current?.(100);
        reportAnalyticsEvent('VIDEO_COMPLETE', {
          watchPct: 100,
          secondsWatched: Math.round(durationRef.current),
          duration: Math.round(durationRef.current),
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoId, reportAnalyticsEvent]);

  if (!videoId) {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <Alert variant="destructive" className="max-w-sm mx-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid YouTube URL</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <Alert variant="destructive" className="max-w-sm mx-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    ...(autoPlay ? { autoplay: '1' } : {}),
  });

  const embedUrl = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;

  return (
    <div className={`relative aspect-video w-full rounded-lg overflow-hidden bg-black ${className}`}>
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title={title || 'YouTube video player'}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError('Failed to load YouTube video. Please check your connection.');
          setIsLoading(false);
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <p className="text-xs text-muted-foreground">Loading YouTube player...</p>
          </div>
        </div>
      )}
    </div>
  );
}
