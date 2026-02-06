/**
 * Live Stream Provider Interface
 *
 * Provider-agnostic interface for live video streaming.
 * Implement this interface for any live streaming provider (Mux Live, AWS IVS, Agora, etc.)
 *
 * To add a new provider:
 * 1. Create a new file: mux-live.provider.ts, aws-ivs.provider.ts, etc.
 * 2. Implement the LiveStreamProvider interface
 * 3. Register it in the LiveStreamModule with the LIVE_STREAM_PROVIDER token
 *
 * Features:
 * - Live class sessions with real-time video
 * - Screen sharing for presentations
 * - Chat/Q&A integration (separate from video)
 * - Recording for later viewing
 * - Low-latency streaming options
 */

// ============ LIVE STREAM TYPES ============

export interface LiveStreamConfig {
  /** Stream title */
  title: string;
  /** Optional description */
  description?: string;
  /** Course ID this stream belongs to */
  courseId?: string;
  /** Scheduled start time */
  scheduledStartTime?: Date;
  /** Maximum duration in minutes */
  maxDurationMinutes?: number;
  /** Maximum concurrent viewers */
  maxViewers?: number;
  /** Enable recording */
  enableRecording?: boolean;
  /** Enable DVR (viewers can rewind live stream) */
  enableDvr?: boolean;
  /** Latency mode */
  latencyMode?: LiveStreamLatencyMode;
  /** Enable low-latency for interactive features */
  lowLatency?: boolean;
  /** Require authentication to view */
  requireAuth?: boolean;
  /** Geographic restrictions */
  allowedCountries?: string[];
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export type LiveStreamLatencyMode =
  | 'normal' // 15-30 seconds latency, best quality
  | 'low' // 5-10 seconds latency
  | 'ultra-low'; // 1-3 seconds latency, for interactive

export interface LiveStream {
  /** Unique identifier in our system */
  id: string;
  /** Provider's stream ID */
  providerStreamId: string;
  /** Provider name */
  provider: string;
  /** Stream title */
  title: string;
  /** Stream status */
  status: LiveStreamStatus;
  /** Stream key for broadcasting (sensitive!) */
  streamKey: string;
  /** RTMP ingest URL */
  rtmpUrl: string;
  /** RTMPS ingest URL (secure) */
  rtmpsUrl?: string;
  /** SRT ingest URL (for OBS Studio) */
  srtUrl?: string;
  /** Playback configuration */
  playback?: LiveStreamPlayback;
  /** Recording asset ID (if recorded) */
  recordingAssetId?: string;
  /** Scheduled start time */
  scheduledStartTime?: Date;
  /** Actual start time */
  startedAt?: Date;
  /** End time */
  endedAt?: Date;
  /** Current viewer count */
  viewerCount?: number;
  /** Peak viewer count */
  peakViewerCount?: number;
  /** Created timestamp */
  createdAt: Date;
  /** Provider-specific metadata */
  providerMetadata?: Record<string, any>;
}

export type LiveStreamStatus =
  | 'created' // Stream created, not yet started
  | 'idle' // No input signal
  | 'starting' // Receiving signal, preparing
  | 'active' // Live and broadcasting
  | 'stopping' // Ending stream
  | 'ended' // Stream ended
  | 'errored'; // Stream encountered error

export interface LiveStreamPlayback {
  /** HLS playback URL */
  hlsUrl: string;
  /** Low-latency HLS URL (if supported) */
  llHlsUrl?: string;
  /** WebRTC playback URL (for ultra-low latency) */
  webrtcUrl?: string;
  /** Thumbnail URL (updates during stream) */
  thumbnailUrl?: string;
}

// ============ BROADCAST SETTINGS ============

export interface BroadcastSettings {
  /** Video resolution */
  resolution: '720p' | '1080p' | '1440p' | '4k';
  /** Video bitrate in kbps */
  videoBitrate: number;
  /** Audio bitrate in kbps */
  audioBitrate: number;
  /** Frame rate */
  frameRate: 24 | 30 | 60;
  /** Keyframe interval in seconds */
  keyframeInterval?: number;
}

// ============ VIEWER ACCESS ============

export interface LiveStreamViewerContext {
  /** User ID */
  userId: string;
  /** User email */
  userEmail: string;
  /** User's IP address */
  ipAddress: string;
  /** Session ID */
  sessionId: string;
  /** Device fingerprint */
  deviceFingerprint?: string;
  /** Token expiration in seconds */
  expiresIn: number;
}

export interface LiveStreamViewerToken {
  /** The signed token */
  token: string;
  /** Playback URLs */
  playback: LiveStreamPlayback;
  /** Token expiration */
  expiresAt: Date;
  /** Watermark config (if enabled) */
  watermark?: {
    text: string;
    opacity: number;
    position: 'fixed' | 'random';
  };
}

// ============ ANALYTICS ============

export interface LiveStreamAnalytics {
  /** Total unique viewers */
  uniqueViewers: number;
  /** Peak concurrent viewers */
  peakConcurrentViewers: number;
  /** Average concurrent viewers */
  averageConcurrentViewers: number;
  /** Total watch time in minutes */
  totalWatchTimeMinutes: number;
  /** Average watch duration per viewer in minutes */
  averageWatchDuration: number;
  /** Stream duration in minutes */
  streamDurationMinutes: number;
  /** Viewer count over time */
  viewerTimeline?: {
    timestamp: Date;
    viewers: number;
  }[];
  /** Viewers by country */
  viewersByCountry?: Record<string, number>;
  /** Viewers by device */
  viewersByDevice?: {
    desktop: number;
    mobile: number;
    tablet: number;
    tv: number;
  };
  /** Chat messages count (if integrated) */
  chatMessagesCount?: number;
  /** Questions asked (if Q&A enabled) */
  questionsCount?: number;
}

// ============ WEBHOOKS ============

export interface LiveStreamWebhookEvent {
  /** Event type */
  type: LiveStreamWebhookEventType;
  /** Provider name */
  provider: string;
  /** Stream ID */
  streamId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, any>;
  /** Raw payload */
  rawPayload: string | Buffer;
  /** Signature */
  signature?: string;
}

export type LiveStreamWebhookEventType =
  | 'stream.created'
  | 'stream.started'
  | 'stream.active'
  | 'stream.idle'
  | 'stream.ended'
  | 'stream.errored'
  | 'stream.recording.ready'
  | 'stream.viewer.joined'
  | 'stream.viewer.left';

// ============ MAIN INTERFACE ============

/**
 * Live Stream Provider Interface
 *
 * All live streaming providers must implement this interface.
 */
export interface LiveStreamProvider {
  /**
   * Provider identifier (e.g., 'mux-live', 'aws-ivs', 'agora')
   */
  readonly providerName: string;

  /**
   * Whether this provider supports ultra-low latency (<3s)
   */
  readonly supportsUltraLowLatency: boolean;

  /**
   * Whether this provider supports recording
   */
  readonly supportsRecording: boolean;

  /**
   * Whether this provider supports DVR (rewind during live)
   */
  readonly supportsDvr: boolean;

  // ============ STREAM MANAGEMENT ============

  /**
   * Create a new live stream
   */
  createStream(config: LiveStreamConfig): Promise<LiveStream>;

  /**
   * Get a live stream by ID
   */
  getStream(streamId: string): Promise<LiveStream | null>;

  /**
   * List live streams
   */
  listStreams(options?: {
    status?: LiveStreamStatus;
    limit?: number;
    cursor?: string;
  }): Promise<{
    streams: LiveStream[];
    nextCursor?: string;
    hasMore: boolean;
  }>;

  /**
   * Update a live stream
   */
  updateStream(
    streamId: string,
    updates: Partial<Pick<LiveStreamConfig, 'title' | 'description' | 'metadata'>>,
  ): Promise<LiveStream>;

  /**
   * Delete a live stream
   */
  deleteStream(streamId: string): Promise<void>;

  /**
   * Reset stream key (security)
   */
  resetStreamKey(streamId: string): Promise<LiveStream>;

  // ============ STREAM CONTROL ============

  /**
   * Start a stream (if not auto-started on input)
   */
  startStream(streamId: string): Promise<LiveStream>;

  /**
   * Stop/end a stream
   */
  stopStream(streamId: string): Promise<LiveStream>;

  // ============ VIEWER ACCESS ============

  /**
   * Generate a viewer token for authenticated playback
   */
  generateViewerToken(
    streamId: string,
    context: LiveStreamViewerContext,
  ): Promise<LiveStreamViewerToken>;

  /**
   * Get current viewer count
   */
  getViewerCount(streamId: string): Promise<number>;

  // ============ RECORDING ============

  /**
   * Get recording for an ended stream
   */
  getRecording(streamId: string): Promise<{
    assetId: string;
    duration: number;
    downloadUrl?: string;
    playbackUrl?: string;
  } | null>;

  // ============ ANALYTICS ============

  /**
   * Get analytics for a stream
   */
  getAnalytics(streamId: string): Promise<LiveStreamAnalytics>;

  // ============ WEBHOOKS ============

  /**
   * Verify and parse a webhook event
   */
  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): LiveStreamWebhookEvent;
}

/**
 * Injection token for the live stream provider
 */
export const LIVE_STREAM_PROVIDER = Symbol('LIVE_STREAM_PROVIDER');

/**
 * Configuration for live stream provider selection
 */
export interface LiveStreamProviderConfig {
  /** Active provider name */
  provider: 'mux-live' | 'aws-ivs' | 'agora' | 'livekit';
  /** Provider-specific configuration */
  config: Record<string, any>;
}
