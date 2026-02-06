'use client';

import { useEffect, useState, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import apiClient from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VideoPlayerProps {
  assetId: string;
  title?: string;
  onProgress?: (percent: number) => void;
  autoPlay?: boolean;
  className?: string;
}

interface PlaybackData {
  playbackUrl: string;
  token: string;
  expiresAt: string;
  assetStatus: string;
}

const PROGRESS_MILESTONES = [25, 50, 75, 90];

export function VideoPlayer({
  assetId,
  title,
  onProgress,
  autoPlay = false,
  className = '',
}: VideoPlayerProps) {
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportedMilestones, setReportedMilestones] = useState<number[]>([]);

  // Fetch playback URL
  const fetchPlayback = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(`/video/assets/${assetId}/playback`, {
        sessionId: `session-${Date.now()}`,
      });
      setPlaybackData(response.data.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to load video';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (assetId) {
      fetchPlayback();
    }
  }, [assetId, fetchPlayback]);

  // Handle video progress - use CustomEvent from MuxPlayer
  const handleTimeUpdate = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ time: number; duration: number }>;
    const { time, duration } = customEvent.detail;
    if (!duration) return;
    
    const percent = (time / duration) * 100;

    // Report milestones
    PROGRESS_MILESTONES.forEach((milestone) => {
      if (percent >= milestone && !reportedMilestones.includes(milestone)) {
        onProgress?.(milestone);
        setReportedMilestones((prev) => [...prev, milestone]);
      }
    });
  }, [onProgress, reportedMilestones]);

  if (isLoading) {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-24" />
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

  if (!playbackData) {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex items-center justify-center ${className}`}>
        <p className="text-sm text-muted-foreground">Video not available</p>
      </div>
    );
  }

  // Check if asset is ready
  if (playbackData.assetStatus !== 'ready') {
    return (
      <div className={`aspect-video w-full rounded-lg bg-muted flex flex-col items-center justify-center gap-2 ${className}`}>
        <Play className="h-8 w-8 text-muted-foreground animate-pulse" />
        <p className="text-sm text-muted-foreground">Video is processing...</p>
        <p className="text-xs text-muted-foreground">Status: {playbackData.assetStatus}</p>
      </div>
    );
  }

  // Extract playback ID from URL
  const playbackId = playbackData.playbackUrl
    .replace('https://stream.mux.com/', '')
    .replace('.m3u8', '');

  return (
    <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
      <MuxPlayer
        playbackId={playbackId}
        tokens={{
          playback: playbackData.token,
        }}
        metadata={{
          video_title: title,
        }}
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        className="w-full aspect-video"
        accentColor="#3b82f6"
      />
    </div>
  );
}
