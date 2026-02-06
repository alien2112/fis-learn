import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VideoProvider,
  VideoUploadOptions,
  DirectUploadUrl,
  VideoAsset,
  VideoAssetStatus,
  PlaybackContext,
  PlaybackToken,
  PlaybackManifest,
  SubtitleTrack,
  VideoAnalytics,
  DateRange,
  VideoWebhookEvent,
} from '../video-provider.interface';

/**
 * Mux Video Provider Implementation
 *
 * Mux (https://mux.com) is a professional video hosting platform
 * with excellent API, DRM support, and analytics.
 *
 * To use this provider:
 * 1. Sign up at https://mux.com
 * 2. Get your API credentials from the dashboard
 * 3. Set environment variables:
 *    - MUX_TOKEN_ID
 *    - MUX_TOKEN_SECRET
 *    - MUX_WEBHOOK_SECRET
 *    - MUX_SIGNING_KEY_ID (for signed URLs)
 *    - MUX_SIGNING_KEY_SECRET (for signed URLs)
 *
 * Features:
 * - HLS/DASH adaptive streaming
 * - Widevine/FairPlay DRM
 * - Automatic transcoding to multiple qualities
 * - Direct uploads (client-side)
 * - Signed URLs for security
 * - Detailed analytics
 * - Thumbnail generation
 * - Auto-generated subtitles
 */
@Injectable()
export class MuxVideoProvider implements VideoProvider {
  private readonly logger = new Logger(MuxVideoProvider.name);
  private mux: any; // Mux SDK type

  readonly providerName = 'mux';
  readonly supportsDrm = true;
  readonly supportsAdaptiveStreaming = true;
  readonly supportsLiveStreaming = true;

  constructor(private readonly configService: ConfigService) {
    this.initializeMuxClient();
  }

  private initializeMuxClient(): void {
    const tokenId = this.configService.get<string>('MUX_TOKEN_ID');
    const tokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET');

    if (!tokenId || !tokenSecret) {
      this.logger.warn(
        'Mux credentials not configured. Video operations will fail.',
      );
      return;
    }

    // Dynamic import for Mux SDK
    // npm install @mux/mux-node
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Mux = require('@mux/mux-node');
      this.mux = new Mux(tokenId, tokenSecret);
      this.logger.log('Mux video provider initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Mux SDK. Install with: npm install @mux/mux-node',
        error,
      );
    }
  }

  // ============ UPLOAD METHODS ============

  async createDirectUpload(options: VideoUploadOptions): Promise<DirectUploadUrl> {
    this.ensureClient();

    const playbackPolicy = options.enableDrm ? ['signed'] : ['public'];

    const upload = await this.mux.Video.Uploads.create({
      new_asset_settings: {
        playback_policy: playbackPolicy,
        mp4_support: 'capped-1080p', // Also create MP4 versions
        master_access: 'temporary', // Allow downloading master for backup
        normalize_audio: true,
        per_title_encode: true, // Optimize encoding per video
        ...(options.maxResolution && {
          encoding_tier: this.getEncodingTier(options.maxResolution),
        }),
        ...(options.autoGenerateCaptions && {
          generated_subtitles: (options.captionLanguages || ['en']).map((lang) => ({
            language_code: lang,
            name: this.getLanguageName(lang),
          })),
        }),
        passthrough: JSON.stringify({
          title: options.title,
          description: options.description,
          ...options.metadata,
        }),
      },
      cors_origin: '*', // Configure for your domains in production
      timeout: 3600, // 1 hour
    });

    return {
      uploadUrl: upload.url,
      assetId: upload.id,
      instructions: {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/*',
        },
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
    };
  }

  async uploadFromUrl(url: string, options: VideoUploadOptions): Promise<VideoAsset> {
    this.ensureClient();

    const playbackPolicy = options.enableDrm ? ['signed'] : ['public'];

    const asset = await this.mux.Video.Assets.create({
      input: url,
      playback_policy: playbackPolicy,
      mp4_support: 'capped-1080p',
      normalize_audio: true,
      per_title_encode: true,
      ...(options.autoGenerateCaptions && {
        generated_subtitles: (options.captionLanguages || ['en']).map((lang) => ({
          language_code: lang,
          name: this.getLanguageName(lang),
        })),
      }),
      passthrough: JSON.stringify({
        title: options.title,
        description: options.description,
        ...options.metadata,
      }),
    });

    return this.mapMuxAssetToVideoAsset(asset, options.title);
  }

  // ============ ASSET MANAGEMENT ============

  async getAsset(assetId: string): Promise<VideoAsset | null> {
    this.ensureClient();

    try {
      const asset = await this.mux.Video.Assets.get(assetId);
      const metadata = this.parsePassthrough(asset.passthrough);
      return this.mapMuxAssetToVideoAsset(asset, metadata?.title || 'Untitled');
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async listAssets(options?: {
    limit?: number;
    cursor?: string;
    status?: VideoAssetStatus;
  }): Promise<{
    assets: VideoAsset[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    this.ensureClient();

    const response = await this.mux.Video.Assets.list({
      limit: options?.limit || 25,
      page: options?.cursor ? parseInt(options.cursor, 10) : 1,
    });

    const assets = response.map((asset: any) => {
      const metadata = this.parsePassthrough(asset.passthrough);
      return this.mapMuxAssetToVideoAsset(asset, metadata?.title || 'Untitled');
    });

    return {
      assets,
      nextCursor: assets.length === (options?.limit || 25)
        ? String((parseInt(options?.cursor || '1', 10) + 1))
        : undefined,
      hasMore: assets.length === (options?.limit || 25),
    };
  }

  async updateAsset(
    assetId: string,
    updates: Partial<Pick<VideoUploadOptions, 'title' | 'description' | 'metadata'>>,
  ): Promise<VideoAsset> {
    this.ensureClient();

    const asset = await this.mux.Video.Assets.get(assetId);
    const existingMetadata = this.parsePassthrough(asset.passthrough);

    // Mux doesn't support direct passthrough updates, but we track in our DB
    // This method is mainly for our internal tracking
    const newMetadata = {
      ...existingMetadata,
      title: updates.title || existingMetadata?.title,
      description: updates.description || existingMetadata?.description,
      ...updates.metadata,
    };

    return this.mapMuxAssetToVideoAsset(asset, newMetadata.title || 'Untitled');
  }

  async deleteAsset(assetId: string): Promise<void> {
    this.ensureClient();
    await this.mux.Video.Assets.del(assetId);
  }

  // ============ PLAYBACK ============

  async generatePlaybackToken(
    assetId: string,
    context: PlaybackContext,
  ): Promise<PlaybackToken> {
    const signingKeyId = this.configService.get<string>('MUX_SIGNING_KEY_ID');
    const signingKeySecret = this.configService.get<string>('MUX_SIGNING_KEY_SECRET');

    if (!signingKeyId || !signingKeySecret) {
      throw new Error('Mux signing keys not configured for secure playback');
    }

    // Get the playback ID from the asset
    const asset = await this.mux.Video.Assets.get(assetId);
    const playbackId = asset.playback_ids?.[0]?.id;

    if (!playbackId) {
      throw new Error('Asset has no playback ID');
    }

    // Generate signed JWT token using Mux's JWT signing
    // npm install jsonwebtoken
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');

    const expiresAt = new Date(Date.now() + context.expiresIn * 1000);

    const token = jwt.sign(
      {
        sub: playbackId,
        aud: 'v', // video playback
        exp: Math.floor(expiresAt.getTime() / 1000),
        kid: signingKeyId,
        // Custom claims for watermarking and tracking
        custom: {
          user_id: context.userId,
          user_email: context.userEmail,
          session_id: context.sessionId,
          ip: context.ipAddress,
        },
      },
      Buffer.from(signingKeySecret, 'base64'),
      { algorithm: 'RS256', keyid: signingKeyId },
    );

    return {
      token,
      expiresAt,
      providerData: {
        playbackId,
        assetId,
      },
    };
  }

  async getPlaybackManifest(
    assetId: string,
    token: PlaybackToken,
  ): Promise<PlaybackManifest> {
    const asset = await this.mux.Video.Assets.get(assetId);
    const playbackId = asset.playback_ids?.[0]?.id;
    const policy = asset.playback_ids?.[0]?.policy;

    if (!playbackId) {
      throw new Error('Asset has no playback ID');
    }

    const baseUrl = `https://stream.mux.com/${playbackId}`;
    const tokenParam = policy === 'signed' ? `?token=${token.token}` : '';

    // Build watermark config if enabled
    const watermark = token.providerData?.custom
      ? {
          visible: true,
          text: `${token.providerData.custom.user_email}`,
          opacity: 0.4,
          position: 'random' as const,
          fontSize: 16,
          color: '#ffffff',
          repositionInterval: 30,
        }
      : undefined;

    return {
      urls: {
        hls: `${baseUrl}.m3u8${tokenParam}`,
        dash: `${baseUrl}.mpd${tokenParam}`,
        mp4: asset.static_renditions?.files?.map((f: any) => ({
          quality: f.name,
          url: `${baseUrl}/${f.name}.mp4${tokenParam}`,
          sizeBytes: f.filesize,
        })),
      },
      drm: policy === 'signed'
        ? {
            widevine: {
              licenseUrl: `https://license.mux.com/license/widevine/${playbackId}?token=${token.token}`,
            },
            fairplay: {
              licenseUrl: `https://license.mux.com/license/fairplay/${playbackId}?token=${token.token}`,
              certificateUrl: 'https://license.mux.com/fairplay/certificate',
            },
          }
        : undefined,
      watermark,
      subtitles: this.mapMuxSubtitles(asset.tracks),
      thumbnailVttUrl: `https://image.mux.com/${playbackId}/storyboard.vtt${tokenParam}`,
      posterUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg${tokenParam}`,
      duration: asset.duration,
      expiresAt: token.expiresAt,
    };
  }

  // ============ SUBTITLES ============

  async addSubtitle(
    assetId: string,
    subtitle: {
      language: string;
      label: string;
      file: Buffer | string;
      format?: 'vtt' | 'srt';
    },
  ): Promise<SubtitleTrack> {
    this.ensureClient();

    const url = typeof subtitle.file === 'string'
      ? subtitle.file
      : await this.uploadSubtitleFile(subtitle.file, subtitle.format || 'vtt');

    const track = await this.mux.Video.Assets.createTrack(assetId, {
      type: 'text',
      text_type: 'subtitles',
      language_code: subtitle.language,
      name: subtitle.label,
      url,
      closed_captions: false,
    });

    return {
      language: subtitle.language,
      label: subtitle.label,
      url: track.url || url,
      format: subtitle.format || 'vtt',
      autoGenerated: false,
    };
  }

  async removeSubtitle(assetId: string, language: string): Promise<void> {
    this.ensureClient();

    const asset = await this.mux.Video.Assets.get(assetId);
    const track = asset.tracks?.find(
      (t: any) => t.type === 'text' && t.language_code === language,
    );

    if (track) {
      await this.mux.Video.Assets.deleteTrack(assetId, track.id);
    }
  }

  // ============ ANALYTICS ============

  async getAnalytics(assetId: string, dateRange: DateRange): Promise<VideoAnalytics> {
    this.ensureClient();

    // Mux Data API
    const filters = [`asset_id:${assetId}`];
    const timeframe = [
      Math.floor(dateRange.start.getTime() / 1000),
      Math.floor(dateRange.end.getTime() / 1000),
    ];

    try {
      const [views, watchTime, realtime] = await Promise.all([
        this.mux.Data.Metrics.breakdown('views', {
          filters,
          timeframe,
          group_by: 'country',
        }),
        this.mux.Data.Metrics.overall('watch_time', { filters, timeframe }),
        this.mux.Data.RealTime.breakdown('current_viewers', { filters }),
      ]);

      const totalViews = views.data?.reduce(
        (sum: number, item: any) => sum + (item.views || 0),
        0,
      ) || 0;

      const viewsByCountry: Record<string, number> = {};
      views.data?.forEach((item: any) => {
        if (item.country) {
          viewsByCountry[item.country] = item.views || 0;
        }
      });

      return {
        views: totalViews,
        uniqueViewers: watchTime.data?.total_unique_viewers || 0,
        totalWatchTime: watchTime.data?.total_watch_time || 0,
        averageWatchPercentage: watchTime.data?.view_average_watch_time || 0,
        peakConcurrentViewers: realtime.data?.[0]?.current_viewers || 0,
        completionRate: watchTime.data?.video_completion_rate || 0,
        viewsByCountry,
        viewsByDevice: {
          desktop: 0, // Would need additional breakdown query
          mobile: 0,
          tablet: 0,
          tv: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch Mux analytics', error);
      // Return empty analytics on error
      return {
        views: 0,
        uniqueViewers: 0,
        totalWatchTime: 0,
        averageWatchPercentage: 0,
        completionRate: 0,
      };
    }
  }

  // ============ WEBHOOKS ============

  verifyWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): VideoWebhookEvent {
    // Mux uses HMAC-SHA256 for webhook verification
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');

    const payloadString = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Mux signature format: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
    const expectedSignature = parts.find((p) => p.startsWith('v1='))?.slice(3);

    if (!timestamp || !expectedSignature) {
      throw new Error('Invalid webhook signature format');
    }

    // Verify timestamp is recent (within 5 minutes)
    const timestampMs = parseInt(timestamp, 10) * 1000;
    if (Date.now() - timestampMs > 5 * 60 * 1000) {
      throw new Error('Webhook timestamp too old');
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payloadString}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    if (computedSignature !== expectedSignature) {
      throw new Error('Invalid webhook signature');
    }

    const data = JSON.parse(payloadString);

    return {
      type: this.mapMuxWebhookType(data.type),
      provider: 'mux',
      assetId: data.data?.id || data.object?.id,
      timestamp: new Date(parseInt(timestamp, 10) * 1000),
      data: data.data || data.object,
      rawPayload: payload,
      signature,
    };
  }

  // ============ PRIVATE HELPERS ============

  private ensureClient(): void {
    if (!this.mux) {
      throw new Error('Mux client not initialized. Check your credentials.');
    }
  }

  private mapMuxAssetToVideoAsset(muxAsset: any, title: string): VideoAsset {
    const playbackId = muxAsset.playback_ids?.[0]?.id;

    return {
      id: muxAsset.id,
      providerAssetId: muxAsset.id,
      provider: 'mux',
      status: this.mapMuxStatus(muxAsset.status),
      title,
      duration: muxAsset.duration ? Math.round(muxAsset.duration) : undefined,
      aspectRatio: muxAsset.aspect_ratio,
      resolutions: muxAsset.static_renditions?.files?.map((f: any) => f.name),
      thumbnails: playbackId
        ? {
            small: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=320`,
            medium: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640`,
            large: `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1280`,
            animated: `https://image.mux.com/${playbackId}/animated.gif`,
          }
        : undefined,
      thumbnailVttUrl: playbackId
        ? `https://image.mux.com/${playbackId}/storyboard.vtt`
        : undefined,
      subtitles: this.mapMuxSubtitles(muxAsset.tracks),
      drmEnabled: muxAsset.playback_ids?.[0]?.policy === 'signed',
      createdAt: new Date(muxAsset.created_at * 1000),
      updatedAt: new Date(muxAsset.updated_at * 1000 || muxAsset.created_at * 1000),
      providerMetadata: {
        playbackId,
        encodingTier: muxAsset.encoding_tier,
        maxStoredResolution: muxAsset.max_stored_resolution,
      },
    };
  }

  private mapMuxStatus(status: string): VideoAssetStatus {
    const statusMap: Record<string, VideoAssetStatus> = {
      preparing: 'preparing',
      waiting: 'uploading',
      ready: 'ready',
      errored: 'errored',
      deleted: 'deleted',
    };
    return statusMap[status] || 'processing';
  }

  private mapMuxSubtitles(tracks: any[]): SubtitleTrack[] {
    return (tracks || [])
      .filter((t) => t.type === 'text')
      .map((t) => ({
        language: t.language_code,
        label: t.name,
        url: t.url || '',
        format: 'vtt' as const,
        autoGenerated: t.text_source === 'generated',
      }));
  }

  private mapMuxWebhookType(muxType: string): any {
    const typeMap: Record<string, string> = {
      'video.asset.created': 'video.asset.created',
      'video.asset.ready': 'video.asset.ready',
      'video.asset.errored': 'video.asset.errored',
      'video.asset.deleted': 'video.asset.deleted',
      'video.upload.created': 'video.upload.started',
      'video.upload.asset_created': 'video.upload.completed',
      'video.asset.track.created': 'video.subtitles.ready',
      'video.live_stream.active': 'video.live.started',
      'video.live_stream.idle': 'video.live.ended',
    };
    return typeMap[muxType] || muxType;
  }

  private parsePassthrough(passthrough?: string): Record<string, any> | null {
    if (!passthrough) return null;
    try {
      return JSON.parse(passthrough);
    } catch {
      return null;
    }
  }

  private getEncodingTier(maxResolution: string): string {
    if (maxResolution === '4k') return 'smart';
    return 'baseline';
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ar: 'Arabic',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      pt: 'Portuguese',
      ru: 'Russian',
    };
    return names[code] || code;
  }

  private async uploadSubtitleFile(
    file: Buffer,
    format: 'vtt' | 'srt',
  ): Promise<string> {
    // In production, upload to S3/GCS and return the URL
    // For now, throw an error indicating this needs implementation
    throw new Error(
      'Direct subtitle buffer upload not implemented. Provide a URL instead.',
    );
  }
}
