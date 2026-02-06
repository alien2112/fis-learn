/**
 * YouTube Provider Interface
 *
 * Secondary video source for embedding YouTube videos (unlisted/private).
 * This is NOT the primary video delivery system - use VideoProvider for that.
 *
 * YouTube Limitations (documented for transparency):
 * - No DRM protection (YouTube's own protection only)
 * - No dynamic watermarking
 * - External Google tracking on viewers
 * - YouTube branding visible
 * - May be blocked by ad blockers/privacy extensions
 * - Subject to YouTube's Terms of Service
 * - Limited analytics (only what YouTube provides)
 * - Videos can be downloaded with third-party tools
 *
 * Use Cases:
 * - Free preview/marketing content
 * - Courses where content protection is not critical
 * - Fallback when primary provider has issues
 * - Existing content already on YouTube
 */

// ============ YOUTUBE VIDEO TYPES ============

export interface YouTubeVideo {
  /** YouTube video ID */
  videoId: string;
  /** Video title */
  title: string;
  /** Video description */
  description?: string;
  /** Channel ID */
  channelId: string;
  /** Channel title */
  channelTitle: string;
  /** Duration in ISO 8601 format (PT#M#S) */
  duration: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** Thumbnail URLs */
  thumbnails: {
    default?: string;
    medium?: string;
    high?: string;
    standard?: string;
    maxres?: string;
  };
  /** Published date */
  publishedAt: Date;
  /** Privacy status */
  privacyStatus: 'public' | 'unlisted' | 'private';
  /** Whether embeddable */
  embeddable: boolean;
  /** View count (if available) */
  viewCount?: number;
  /** Like count (if available) */
  likeCount?: number;
}

export interface YouTubePlaylist {
  /** Playlist ID */
  playlistId: string;
  /** Playlist title */
  title: string;
  /** Playlist description */
  description?: string;
  /** Channel ID */
  channelId: string;
  /** Channel title */
  channelTitle: string;
  /** Number of items */
  itemCount: number;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Privacy status */
  privacyStatus: 'public' | 'unlisted' | 'private';
  /** Published date */
  publishedAt: Date;
}

export interface YouTubePlaylistItem {
  /** Item position in playlist */
  position: number;
  /** Video details */
  video: YouTubeVideo;
}

// ============ EMBED CONFIGURATION ============

export interface YouTubeEmbedOptions {
  /** Start time in seconds */
  start?: number;
  /** End time in seconds */
  end?: number;
  /** Autoplay (requires muted) */
  autoplay?: boolean;
  /** Mute by default */
  muted?: boolean;
  /** Show player controls */
  controls?: boolean;
  /** Disable keyboard controls */
  disableKeyboard?: boolean;
  /** Enable fullscreen button */
  fullscreen?: boolean;
  /** Loop video */
  loop?: boolean;
  /** Show related videos at end (same channel only since 2018) */
  showRelated?: boolean;
  /** Interface language (ISO 639-1) */
  language?: string;
  /** Closed captions language */
  captionsLanguage?: string;
  /** Show captions by default */
  showCaptions?: boolean;
  /** Modest branding (smaller YouTube logo) */
  modestBranding?: boolean;
  /** Color theme */
  color?: 'red' | 'white';
  /** Playlist ID to play from */
  playlistId?: string;
  /** Player ID for API control */
  playerId?: string;
  /** Enable JS API */
  enableJsApi?: boolean;
  /** Origin for postMessage (security) */
  origin?: string;
  /** Widget referrer */
  widgetReferrer?: string;
}

export interface YouTubeEmbedUrl {
  /** Standard embed URL */
  embedUrl: string;
  /** Privacy-enhanced embed URL (youtube-nocookie.com) */
  privacyEnhancedUrl: string;
  /** Embed iframe HTML */
  iframeHtml: string;
}

// ============ VALIDATION ============

export interface YouTubeValidationResult {
  /** Whether the video/playlist is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Error code */
  errorCode?: YouTubeValidationErrorCode;
  /** The validated resource (if valid) */
  resource?: YouTubeVideo | YouTubePlaylist;
}

export type YouTubeValidationErrorCode =
  | 'NOT_FOUND' // Video/playlist doesn't exist
  | 'PRIVATE' // Video is private and inaccessible
  | 'NOT_EMBEDDABLE' // Video embedding is disabled
  | 'REGION_BLOCKED' // Video is blocked in certain regions
  | 'AGE_RESTRICTED' // Video requires age verification
  | 'LIVE_STREAM' // Video is a live stream (may need different handling)
  | 'PREMIERE' // Video is a scheduled premiere
  | 'MEMBERS_ONLY' // Video is for channel members only
  | 'INVALID_URL' // URL format is invalid
  | 'API_ERROR'; // YouTube API error

// ============ MAIN INTERFACE ============

/**
 * YouTube Provider Interface
 *
 * Handles YouTube video embedding as a secondary content source.
 */
export interface YouTubeProvider {
  /**
   * Provider identifier
   */
  readonly providerName: 'youtube';

  // ============ VIDEO METHODS ============

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null;

  /**
   * Extract playlist ID from various YouTube URL formats
   */
  extractPlaylistId(url: string): string | null;

  /**
   * Validate a YouTube video (check if it exists, is embeddable, etc.)
   */
  validateVideo(videoIdOrUrl: string): Promise<YouTubeValidationResult>;

  /**
   * Get video details
   */
  getVideo(videoIdOrUrl: string): Promise<YouTubeVideo | null>;

  /**
   * Get multiple videos by IDs
   */
  getVideos(videoIds: string[]): Promise<YouTubeVideo[]>;

  // ============ PLAYLIST METHODS ============

  /**
   * Validate a YouTube playlist
   */
  validatePlaylist(playlistIdOrUrl: string): Promise<YouTubeValidationResult>;

  /**
   * Get playlist details
   */
  getPlaylist(playlistIdOrUrl: string): Promise<YouTubePlaylist | null>;

  /**
   * Get all videos in a playlist
   */
  getPlaylistVideos(
    playlistIdOrUrl: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
    },
  ): Promise<{
    items: YouTubePlaylistItem[];
    nextPageToken?: string;
    totalResults: number;
  }>;

  // ============ EMBED METHODS ============

  /**
   * Generate embed URLs for a video
   */
  generateEmbedUrl(videoId: string, options?: YouTubeEmbedOptions): YouTubeEmbedUrl;

  /**
   * Generate embed URL for playlist
   */
  generatePlaylistEmbedUrl(
    playlistId: string,
    options?: YouTubeEmbedOptions,
  ): YouTubeEmbedUrl;

  // ============ UTILITY METHODS ============

  /**
   * Parse ISO 8601 duration to seconds
   */
  parseDuration(isoDuration: string): number;

  /**
   * Check if a video URL is from YouTube
   */
  isYouTubeUrl(url: string): boolean;
}

/**
 * Injection token for the YouTube provider
 */
export const YOUTUBE_PROVIDER = Symbol('YOUTUBE_PROVIDER');

/**
 * Configuration for YouTube provider
 */
export interface YouTubeProviderConfig {
  /** YouTube Data API v3 key */
  apiKey: string;
  /** Default embed options */
  defaultEmbedOptions?: Partial<YouTubeEmbedOptions>;
  /** Enable privacy-enhanced mode by default (youtube-nocookie.com) */
  privacyEnhancedDefault?: boolean;
}
