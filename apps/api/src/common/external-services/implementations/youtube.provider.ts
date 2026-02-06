import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  YouTubeProvider,
  YouTubeVideo,
  YouTubePlaylist,
  YouTubePlaylistItem,
  YouTubeEmbedOptions,
  YouTubeEmbedUrl,
  YouTubeValidationResult,
  YouTubeValidationErrorCode,
  YouTubeProviderConfig,
} from '../youtube-provider.interface';

/**
 * YouTube Provider Implementation
 *
 * Handles YouTube video embedding as a SECONDARY content source.
 * NOT the primary video delivery system - use VideoProvider (Mux, etc.) for that.
 *
 * IMPORTANT LIMITATIONS:
 * - No DRM protection (only YouTube's own protection)
 * - No dynamic watermarking
 * - External Google tracking on viewers
 * - YouTube branding always visible
 * - May be blocked by ad blockers/privacy extensions
 * - Subject to YouTube's Terms of Service
 * - Limited analytics access
 * - Videos easily downloadable with third-party tools
 *
 * RECOMMENDED USE CASES:
 * - Free preview/marketing content
 * - Courses where content protection is NOT critical
 * - Fallback when primary provider has issues
 * - Leveraging existing YouTube content
 *
 * Setup:
 * 1. Go to https://console.developers.google.com
 * 2. Create a project
 * 3. Enable YouTube Data API v3
 * 4. Create API key (restrict to your domains)
 * 5. Set YOUTUBE_API_KEY in environment
 */
@Injectable()
export class YouTubeProviderImpl implements YouTubeProvider {
  private readonly logger = new Logger(YouTubeProviderImpl.name);
  private readonly apiKey: string;
  private readonly defaultEmbedOptions: Partial<YouTubeEmbedOptions>;
  private readonly privacyEnhancedDefault: boolean;

  readonly providerName = 'youtube' as const;

  // YouTube URL patterns
  private readonly patterns = {
    // youtube.com/watch?v=VIDEO_ID
    standard: /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
    // youtu.be/VIDEO_ID
    short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/embed/VIDEO_ID
    embed: /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // youtube.com/v/VIDEO_ID
    legacy: /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    // youtube-nocookie.com/embed/VIDEO_ID
    privacyEmbed: /youtube-nocookie\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Playlist patterns
    playlist: /[?&]list=([a-zA-Z0-9_-]+)/,
    playlistOnly: /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  };

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY') || '';
    this.privacyEnhancedDefault = this.configService.get<boolean>('YOUTUBE_PRIVACY_ENHANCED', true);
    this.defaultEmbedOptions = {
      controls: true,
      fullscreen: true,
      modestBranding: true,
      showRelated: false,
      enableJsApi: true,
    };

    if (!this.apiKey) {
      this.logger.warn(
        'YouTube API key not configured. Video validation will be limited.',
      );
    }
  }

  // ============ VIDEO ID/URL EXTRACTION ============

  extractVideoId(url: string): string | null {
    if (!url) return null;

    // Clean the URL
    const cleanUrl = url.trim();

    // Check if it's already just a video ID (11 chars, alphanumeric + _ -)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return cleanUrl;
    }

    // Try each pattern
    for (const pattern of [
      this.patterns.standard,
      this.patterns.short,
      this.patterns.embed,
      this.patterns.legacy,
      this.patterns.privacyEmbed,
    ]) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  extractPlaylistId(url: string): string | null {
    if (!url) return null;

    const cleanUrl = url.trim();

    // Check if it's already just a playlist ID
    if (/^[a-zA-Z0-9_-]+$/.test(cleanUrl) && cleanUrl.length > 11) {
      return cleanUrl;
    }

    // Try playlist patterns
    for (const pattern of [this.patterns.playlistOnly, this.patterns.playlist]) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  isYouTubeUrl(url: string): boolean {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().trim();
    return (
      cleanUrl.includes('youtube.com') ||
      cleanUrl.includes('youtu.be') ||
      cleanUrl.includes('youtube-nocookie.com')
    );
  }

  // ============ VIDEO VALIDATION & FETCHING ============

  async validateVideo(videoIdOrUrl: string): Promise<YouTubeValidationResult> {
    const videoId = this.extractVideoId(videoIdOrUrl);

    if (!videoId) {
      return {
        valid: false,
        error: 'Invalid YouTube URL or video ID',
        errorCode: 'INVALID_URL',
      };
    }

    if (!this.apiKey) {
      // Without API key, we can only do basic validation
      return {
        valid: true, // Assume valid, let frontend handle errors
        resource: {
          videoId,
          title: 'Unknown (API key not configured)',
          channelId: '',
          channelTitle: '',
          duration: 'PT0S',
          durationSeconds: 0,
          thumbnails: {
            default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
            medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          },
          publishedAt: new Date(),
          privacyStatus: 'unlisted',
          embeddable: true,
        },
      };
    }

    try {
      const video = await this.getVideo(videoId);

      if (!video) {
        return {
          valid: false,
          error: 'Video not found or is private',
          errorCode: 'NOT_FOUND',
        };
      }

      if (!video.embeddable) {
        return {
          valid: false,
          error: 'Video embedding is disabled by the owner',
          errorCode: 'NOT_EMBEDDABLE',
        };
      }

      return {
        valid: true,
        resource: video,
      };
    } catch (error: any) {
      this.logger.error(`Failed to validate YouTube video: ${videoId}`, error);

      return {
        valid: false,
        error: error.message || 'Failed to validate video',
        errorCode: 'API_ERROR',
      };
    }
  }

  async getVideo(videoIdOrUrl: string): Promise<YouTubeVideo | null> {
    const videoId = this.extractVideoId(videoIdOrUrl);
    if (!videoId) return null;

    if (!this.apiKey) {
      // Return basic info without API
      return {
        videoId,
        title: 'YouTube Video',
        channelId: '',
        channelTitle: '',
        duration: 'PT0S',
        durationSeconds: 0,
        thumbnails: {
          default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
          medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        },
        publishedAt: new Date(),
        privacyStatus: 'unlisted',
        embeddable: true,
      };
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('id', videoId);
    url.searchParams.set('part', 'snippet,contentDetails,status,statistics');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    return this.mapYouTubeVideo(item);
  }

  async getVideos(videoIds: string[]): Promise<YouTubeVideo[]> {
    if (!this.apiKey || videoIds.length === 0) {
      return [];
    }

    // YouTube API allows up to 50 videos per request
    const chunks = this.chunkArray(videoIds, 50);
    const results: YouTubeVideo[] = [];

    for (const chunk of chunks) {
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('id', chunk.join(','));
      url.searchParams.set('part', 'snippet,contentDetails,status,statistics');

      const response = await fetch(url.toString());

      if (!response.ok) {
        this.logger.error(`YouTube API error: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.items) {
        results.push(...data.items.map((item: any) => this.mapYouTubeVideo(item)));
      }
    }

    return results;
  }

  // ============ PLAYLIST METHODS ============

  async validatePlaylist(playlistIdOrUrl: string): Promise<YouTubeValidationResult> {
    const playlistId = this.extractPlaylistId(playlistIdOrUrl);

    if (!playlistId) {
      return {
        valid: false,
        error: 'Invalid YouTube playlist URL or ID',
        errorCode: 'INVALID_URL',
      };
    }

    try {
      const playlist = await this.getPlaylist(playlistId);

      if (!playlist) {
        return {
          valid: false,
          error: 'Playlist not found or is private',
          errorCode: 'NOT_FOUND',
        };
      }

      return {
        valid: true,
        resource: playlist,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate playlist',
        errorCode: 'API_ERROR',
      };
    }
  }

  async getPlaylist(playlistIdOrUrl: string): Promise<YouTubePlaylist | null> {
    const playlistId = this.extractPlaylistId(playlistIdOrUrl);
    if (!playlistId) return null;

    if (!this.apiKey) {
      return {
        playlistId,
        title: 'YouTube Playlist',
        channelId: '',
        channelTitle: '',
        itemCount: 0,
        privacyStatus: 'unlisted',
        publishedAt: new Date(),
      };
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/playlists');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('id', playlistId);
    url.searchParams.set('part', 'snippet,contentDetails,status');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    return {
      playlistId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      itemCount: item.contentDetails.itemCount,
      thumbnailUrl:
        item.snippet.thumbnails?.maxres?.url ||
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url,
      privacyStatus: item.status.privacyStatus,
      publishedAt: new Date(item.snippet.publishedAt),
    };
  }

  async getPlaylistVideos(
    playlistIdOrUrl: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
    },
  ): Promise<{
    items: YouTubePlaylistItem[];
    nextPageToken?: string;
    totalResults: number;
  }> {
    const playlistId = this.extractPlaylistId(playlistIdOrUrl);
    if (!playlistId) {
      return { items: [], totalResults: 0 };
    }

    if (!this.apiKey) {
      return { items: [], totalResults: 0 };
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('part', 'snippet,contentDetails,status');
    url.searchParams.set('maxResults', String(options?.maxResults || 50));

    if (options?.pageToken) {
      url.searchParams.set('pageToken', options.pageToken);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    // Get full video details for duration and other info
    const videoIds = data.items
      .map((item: any) => item.contentDetails.videoId)
      .filter(Boolean);

    const videos = await this.getVideos(videoIds);
    const videoMap = new Map(videos.map((v) => [v.videoId, v]));

    const items: YouTubePlaylistItem[] = data.items.map((item: any) => ({
      position: item.snippet.position,
      video:
        videoMap.get(item.contentDetails.videoId) ||
        this.mapPlaylistItemToVideo(item),
    }));

    return {
      items,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo.totalResults,
    };
  }

  // ============ EMBED URL GENERATION ============

  generateEmbedUrl(
    videoId: string,
    options?: YouTubeEmbedOptions,
  ): YouTubeEmbedUrl {
    const opts = { ...this.defaultEmbedOptions, ...options };
    const params = this.buildEmbedParams(opts);

    const baseUrl = this.privacyEnhancedDefault
      ? 'https://www.youtube-nocookie.com'
      : 'https://www.youtube.com';

    const embedUrl = `${baseUrl}/embed/${videoId}${params ? '?' + params : ''}`;
    const privacyEnhancedUrl = `https://www.youtube-nocookie.com/embed/${videoId}${params ? '?' + params : ''}`;

    const width = 560;
    const height = 315;
    const iframeHtml = `<iframe width="${width}" height="${height}" src="${privacyEnhancedUrl}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ${opts.fullscreen ? 'allowfullscreen' : ''}></iframe>`;

    return {
      embedUrl,
      privacyEnhancedUrl,
      iframeHtml,
    };
  }

  generatePlaylistEmbedUrl(
    playlistId: string,
    options?: YouTubeEmbedOptions,
  ): YouTubeEmbedUrl {
    const opts = { ...this.defaultEmbedOptions, ...options };
    const params = this.buildEmbedParams(opts);

    const paramString = params ? `${params}&` : '';
    const baseUrl = this.privacyEnhancedDefault
      ? 'https://www.youtube-nocookie.com'
      : 'https://www.youtube.com';

    const embedUrl = `${baseUrl}/embed/videoseries?${paramString}list=${playlistId}`;
    const privacyEnhancedUrl = `https://www.youtube-nocookie.com/embed/videoseries?${paramString}list=${playlistId}`;

    const width = 560;
    const height = 315;
    const iframeHtml = `<iframe width="${width}" height="${height}" src="${privacyEnhancedUrl}" title="YouTube playlist player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ${opts.fullscreen ? 'allowfullscreen' : ''}></iframe>`;

    return {
      embedUrl,
      privacyEnhancedUrl,
      iframeHtml,
    };
  }

  // ============ UTILITY METHODS ============

  parseDuration(isoDuration: string): number {
    if (!isoDuration) return 0;

    // ISO 8601 duration: PT#H#M#S
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  // ============ PRIVATE HELPERS ============

  private mapYouTubeVideo(item: any): YouTubeVideo {
    return {
      videoId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      duration: item.contentDetails.duration,
      durationSeconds: this.parseDuration(item.contentDetails.duration),
      thumbnails: {
        default: item.snippet.thumbnails?.default?.url,
        medium: item.snippet.thumbnails?.medium?.url,
        high: item.snippet.thumbnails?.high?.url,
        standard: item.snippet.thumbnails?.standard?.url,
        maxres: item.snippet.thumbnails?.maxres?.url,
      },
      publishedAt: new Date(item.snippet.publishedAt),
      privacyStatus: item.status.privacyStatus,
      embeddable: item.status.embeddable,
      viewCount: parseInt(item.statistics?.viewCount || '0', 10),
      likeCount: parseInt(item.statistics?.likeCount || '0', 10),
    };
  }

  private mapPlaylistItemToVideo(item: any): YouTubeVideo {
    return {
      videoId: item.contentDetails.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId || '',
      channelTitle: item.snippet.channelTitle || '',
      duration: 'PT0S',
      durationSeconds: 0,
      thumbnails: {
        default: item.snippet.thumbnails?.default?.url,
        medium: item.snippet.thumbnails?.medium?.url,
        high: item.snippet.thumbnails?.high?.url,
        standard: item.snippet.thumbnails?.standard?.url,
        maxres: item.snippet.thumbnails?.maxres?.url,
      },
      publishedAt: new Date(item.snippet.publishedAt || Date.now()),
      privacyStatus: item.status?.privacyStatus || 'unlisted',
      embeddable: true,
    };
  }

  private buildEmbedParams(options: YouTubeEmbedOptions): string {
    const params: string[] = [];

    if (options.start !== undefined) params.push(`start=${options.start}`);
    if (options.end !== undefined) params.push(`end=${options.end}`);
    if (options.autoplay) params.push('autoplay=1');
    if (options.muted) params.push('mute=1');
    if (options.controls === false) params.push('controls=0');
    if (options.disableKeyboard) params.push('disablekb=1');
    if (options.fullscreen === false) params.push('fs=0');
    if (options.loop) params.push('loop=1');
    if (options.showRelated === false) params.push('rel=0');
    if (options.language) params.push(`hl=${options.language}`);
    if (options.captionsLanguage) params.push(`cc_lang_pref=${options.captionsLanguage}`);
    if (options.showCaptions) params.push('cc_load_policy=1');
    if (options.modestBranding) params.push('modestbranding=1');
    if (options.color) params.push(`color=${options.color}`);
    if (options.playlistId) params.push(`list=${options.playlistId}`);
    if (options.playerId) params.push(`playsinline=1`);
    if (options.enableJsApi) params.push('enablejsapi=1');
    if (options.origin) params.push(`origin=${encodeURIComponent(options.origin)}`);
    if (options.widgetReferrer) params.push(`widget_referrer=${encodeURIComponent(options.widgetReferrer)}`);

    return params.join('&');
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
