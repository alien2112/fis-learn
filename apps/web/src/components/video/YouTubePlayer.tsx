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

// YouTube Player types
interface YouTubePlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YouTubePlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YouTubePlayerInstance;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PROGRESS_MILESTONES = [25, 50, 75, 90];
const POLL_INTERVAL = 5000; // Check progress every 5 seconds

export function YouTubePlayer({
  youtubeUrl,
  title,
  lessonId,
  courseId,
  onProgress,
  autoPlay = false,
  className = '',
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);
  const reportedMilestonesRef = useRef<number[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedProgressRef = useRef<number>(0);

  // Extract video ID from various YouTube URL formats
  const extractVideoId = useCallback((url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }, []);

  const videoId = extractVideoId(youtubeUrl);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT?.Player) {
      setIsAPIReady(true);
      return;
    }

    // Create script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
    };

    return () => {
      window.onYouTubeIframeAPIReady = undefined;
    };
  }, []);

  // Report analytics event
  const reportAnalyticsEvent = useCallback(
    async (eventType: string, payload: Record<string, any>) => {
      if (!courseId || !lessonId) return;

      try {
        await apiClient.post('/analytics/events', {
          events: [
            {
              eventType,
              courseId,
              lessonId,
              timestamp: Date.now(),
              payload: {
                videoId,
                ...payload,
              },
            },
          ],
        });
      } catch (err) {
        // Silently fail analytics - don't disrupt learning
        console.debug('Failed to report analytics:', err);
      }
    },
    [courseId, lessonId, videoId]
  );

  // Track and report progress
  const trackProgress = useCallback(() => {
    if (!playerRef.current) return;

    try {
      const currentTime = playerRef.current.getCurrentTime();
      const duration = playerRef.current.getDuration();

      if (!duration || duration <= 0) return;

      const percent = (currentTime / duration) * 100;
      const roundedPercent = Math.round(percent);

      // Report milestones
      PROGRESS_MILESTONES.forEach((milestone) => {
        if (percent >= milestone && !reportedMilestonesRef.current.includes(milestone)) {
          // Call the onProgress callback
          onProgress?.(milestone);

          // Report analytics
          reportAnalyticsEvent(
            milestone >= 90 ? 'VIDEO_COMPLETE' : 'VIDEO_PROGRESS',
            {
              watchPct: milestone,
              secondsWatched: Math.round(currentTime),
              duration: Math.round(duration),
            }
          );

          reportedMilestonesRef.current.push(milestone);
        }
      });

      // Report continuous progress every 10% increment
      const tenPercentIncrement = Math.floor(percent / 10) * 10;
      if (tenPercentIncrement > lastReportedProgressRef.current && tenPercentIncrement < 100) {
        reportAnalyticsEvent('VIDEO_PROGRESS', {
          watchPct: tenPercentIncrement,
          secondsWatched: Math.round(currentTime),
          duration: Math.round(duration),
        });
        lastReportedProgressRef.current = tenPercentIncrement;
      }
    } catch (err) {
      // Player might not be ready
      console.debug('Error tracking progress:', err);
    }
  }, [onProgress, reportAnalyticsEvent]);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isAPIReady || !videoId || !containerRef.current) return;

    const container = containerRef.current;
    const playerId = `youtube-player-${videoId}`;

    // Create player element
    const playerDiv = document.createElement('div');
    playerDiv.id = playerId;
    container.innerHTML = '';
    container.appendChild(playerDiv);

    try {
      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          rel: 0, // Don't show related videos
          modestbranding: 1, // Minimal YouTube branding
          enablejsapi: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: (event) => {
            setIsLoading(false);

            // Report video play event
            reportAnalyticsEvent('VIDEO_PLAY', {
              secondsWatched: 0,
              duration: Math.round(event.target.getDuration()),
            });

            // Start progress tracking
            progressIntervalRef.current = setInterval(trackProgress, POLL_INTERVAL);
          },
          onStateChange: (event) => {
            const playerState = window.YT.PlayerState;

            if (event.data === playerState.PLAYING) {
              // Report resume if not at beginning
              const currentTime = event.target.getCurrentTime();
              if (currentTime > 5) {
                reportAnalyticsEvent('VIDEO_PLAY', {
                  secondsWatched: Math.round(currentTime),
                  duration: Math.round(event.target.getDuration()),
                });
              }
            } else if (event.data === playerState.PAUSED) {
              // Report pause with current position
              reportAnalyticsEvent('VIDEO_PAUSE', {
                secondsWatched: Math.round(event.target.getCurrentTime()),
                duration: Math.round(event.target.getDuration()),
              });
            } else if (event.data === playerState.ENDED) {
              // Video completed - report 100%
              onProgress?.(100);
              reportAnalyticsEvent('VIDEO_COMPLETE', {
                watchPct: 100,
                secondsWatched: Math.round(event.target.getDuration()),
                duration: Math.round(event.target.getDuration()),
              });
            }
          },
          onError: (event) => {
            setError('Failed to load YouTube video. Please try again.');
            setIsLoading(false);

            // Report error
            reportAnalyticsEvent('VIDEO_ERROR', {
              errorCode: event.data,
            });
          },
        },
      });
    } catch (err) {
      setError('Failed to initialize YouTube player');
      setIsLoading(false);
    }

    return () => {
      // Cleanup
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [isAPIReady, videoId, autoPlay, onProgress, reportAnalyticsEvent, trackProgress]);

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

  if (isLoading) {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <p className="text-xs text-muted-foreground">Loading YouTube player...</p>
        </div>
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

  return (
    <div
      ref={containerRef}
      className={`aspect-video w-full rounded-lg overflow-hidden bg-black ${className}`}
      aria-label={title || 'YouTube video player'}
    />
  );
}
