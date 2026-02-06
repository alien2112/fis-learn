import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  VIDEO_PROVIDER,
  YOUTUBE_PROVIDER,
  VideoProvider,
  YouTubeProvider,
  VideoUploadOptions,
  PlaybackContext,
  PlaybackManifest,
  VideoAsset as ProviderVideoAsset,
  VideoAnalytics,
  DateRange,
} from '../../common/external-services';
import { VideoAsset, VideoAssetStatus, User, Role, Prisma } from '@prisma/client';

/**
 * Video Service
 *
 * Orchestrates video operations using the provider-agnostic interfaces.
 * Handles both primary video hosting and YouTube as secondary source.
 *
 * Key Features:
 * - Provider-agnostic video upload and management
 * - YouTube video validation and embedding
 * - Secure playback token generation
 * - Analytics and progress tracking
 * - Access control enforcement
 */
@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(VIDEO_PROVIDER) private readonly videoProvider: VideoProvider,
    @Inject(YOUTUBE_PROVIDER) private readonly youtubeProvider: YouTubeProvider,
  ) {
    this.logger.log(`Video service initialized with provider: ${this.videoProvider.providerName}`);
  }

  // ============ VIDEO UPLOAD ============

  /**
   * Create a direct upload URL for client-side uploads
   * The client uploads directly to the video provider, avoiding server bandwidth
   */
  async createDirectUpload(
    userId: string,
    options: {
      title: string;
      description?: string;
      folderId?: string;
      enableDrm?: boolean;
      enableWatermark?: boolean;
    },
  ): Promise<{
    uploadUrl: string;
    assetId: string;
    instructions?: any;
  }> {
    // Create upload URL from provider
    const upload = await this.videoProvider.createDirectUpload({
      title: options.title,
      description: options.description,
      folderId: options.folderId,
      enableDrm: options.enableDrm ?? true,
      enableWatermark: options.enableWatermark ?? true,
      autoGenerateCaptions: true,
      captionLanguages: ['en'],
    });

    // Create database record
    await this.prisma.videoAsset.create({
      data: {
        provider: this.videoProvider.providerName,
        providerAssetId: upload.assetId,
        title: options.title,
        description: options.description,
        status: 'PREPARING',
        drmEnabled: options.enableDrm ?? true,
        watermarkEnabled: options.enableWatermark ?? true,
        uploadedById: userId,
        folderId: options.folderId,
      },
    });

    return {
      uploadUrl: upload.uploadUrl,
      assetId: upload.assetId,
      instructions: upload.instructions,
    };
  }

  /**
   * Upload a video from a URL (server-side)
   */
  async uploadFromUrl(
    userId: string,
    url: string,
    options: {
      title: string;
      description?: string;
      folderId?: string;
    },
  ): Promise<VideoAsset> {
    const providerAsset = await this.videoProvider.uploadFromUrl(url, {
      title: options.title,
      description: options.description,
      enableDrm: true,
      enableWatermark: true,
      autoGenerateCaptions: true,
    });

    return this.prisma.videoAsset.create({
      data: {
        provider: this.videoProvider.providerName,
        providerAssetId: providerAsset.providerAssetId,
        title: options.title,
        description: options.description,
        status: this.mapProviderStatus(providerAsset.status),
        duration: providerAsset.duration,
        aspectRatio: providerAsset.aspectRatio,
        resolutions: providerAsset.resolutions as any,
        thumbnails: providerAsset.thumbnails as any,
        thumbnailVttUrl: providerAsset.thumbnailVttUrl,
        drmEnabled: providerAsset.drmEnabled ?? true,
        watermarkEnabled: true,
        uploadedById: userId,
        folderId: options.folderId,
        providerMetadata: providerAsset.providerMetadata as any,
      },
    });
  }

  // ============ ASSET MANAGEMENT ============

  /**
   * Get a video asset by ID
   */
  async getAsset(assetId: string): Promise<VideoAsset | null> {
    return this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: {
        subtitles: true,
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Get a video asset by provider asset ID
   */
  async getAssetByProviderId(
    provider: string,
    providerAssetId: string,
  ): Promise<VideoAsset | null> {
    return this.prisma.videoAsset.findUnique({
      where: {
        provider_providerAssetId: { provider, providerAssetId },
      },
    });
  }

  /**
   * List video assets for a user
   */
  async listAssets(
    userId: string,
    options?: {
      status?: VideoAssetStatus;
      folderId?: string;
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    assets: VideoAsset[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const limit = options?.limit || 25;

    const where: Prisma.VideoAssetWhereInput = {
      uploadedById: userId,
      ...(options?.status && { status: options.status }),
      ...(options?.folderId && { folderId: options.folderId }),
    };

    const assets = await this.prisma.videoAsset.findMany({
      where,
      take: limit + 1, // Get one extra to check for more
      ...(options?.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        subtitles: true,
      },
    });

    const hasMore = assets.length > limit;
    if (hasMore) assets.pop(); // Remove the extra item

    return {
      assets,
      nextCursor: hasMore ? assets[assets.length - 1]?.id : undefined,
      hasMore,
    };
  }

  /**
   * Update video asset
   */
  async updateAsset(
    assetId: string,
    userId: string,
    updates: {
      title?: string;
      description?: string;
      folderId?: string;
    },
  ): Promise<VideoAsset> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Video asset not found');
    }

    if (asset.uploadedById !== userId) {
      throw new ForbiddenException('You do not have permission to update this video');
    }

    // Update provider metadata if needed
    if (updates.title || updates.description) {
      await this.videoProvider.updateAsset(asset.providerAssetId, {
        title: updates.title,
        description: updates.description,
      });
    }

    return this.prisma.videoAsset.update({
      where: { id: assetId },
      data: updates,
    });
  }

  /**
   * Delete video asset
   */
  async deleteAsset(assetId: string, userId: string, isAdmin = false): Promise<void> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Video asset not found');
    }

    if (!isAdmin && asset.uploadedById !== userId) {
      throw new ForbiddenException('You do not have permission to delete this video');
    }

    // Delete from provider
    try {
      await this.videoProvider.deleteAsset(asset.providerAssetId);
    } catch (error) {
      this.logger.error(`Failed to delete from provider: ${asset.providerAssetId}`, error);
    }

    // Soft delete in database
    await this.prisma.videoAsset.update({
      where: { id: assetId },
      data: { status: 'DELETED' },
    });
  }

  // ============ PLAYBACK ============

  /**
   * Generate playback manifest for a video
   * This is the main method called when a user wants to watch a video
   */
  async getPlaybackManifest(
    assetId: string,
    user: { id: string; email: string },
    context: {
      ipAddress: string;
      sessionId: string;
      deviceFingerprint?: string;
    },
  ): Promise<PlaybackManifest> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
      include: { subtitles: true },
    });

    if (!asset) {
      throw new NotFoundException('Video not found');
    }

    if (asset.status !== 'READY') {
      throw new ForbiddenException('Video is not ready for playback');
    }

    // Generate playback token
    const playbackContext: PlaybackContext = {
      userId: user.id,
      userEmail: user.email,
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
      deviceFingerprint: context.deviceFingerprint,
      expiresIn: 3600, // 1 hour
    };

    const token = await this.videoProvider.generatePlaybackToken(
      asset.providerAssetId,
      playbackContext,
    );

    // Get playback manifest
    const manifest = await this.videoProvider.getPlaybackManifest(
      asset.providerAssetId,
      token,
    );

    // Log playback start
    await this.logPlaybackStart(asset.id, user.id, context);

    return manifest;
  }

  // ============ YOUTUBE INTEGRATION ============

  /**
   * Validate a YouTube video URL
   */
  async validateYouTubeVideo(url: string): Promise<{
    valid: boolean;
    video?: any;
    error?: string;
    limitations?: string[];
  }> {
    const result = await this.youtubeProvider.validateVideo(url);

    const limitations = [
      'No DRM protection - video can be downloaded with third-party tools',
      'No dynamic watermarking - cannot trace leaks',
      'Google/YouTube tracking enabled on viewers',
      'YouTube branding always visible',
      'May be blocked by ad blockers or privacy extensions',
      'Subject to YouTube Terms of Service',
      'Limited analytics compared to hosted videos',
    ];

    return {
      valid: result.valid,
      video: result.resource,
      error: result.error,
      limitations: result.valid ? limitations : undefined,
    };
  }

  /**
   * Get YouTube video embed URL
   */
  getYouTubeEmbedUrl(
    videoIdOrUrl: string,
    options?: {
      start?: number;
      autoplay?: boolean;
      showControls?: boolean;
    },
  ): {
    embedUrl: string;
    privacyEnhancedUrl: string;
    iframeHtml: string;
  } {
    const videoId = this.youtubeProvider.extractVideoId(videoIdOrUrl);
    if (!videoId) {
      throw new NotFoundException('Invalid YouTube URL');
    }

    return this.youtubeProvider.generateEmbedUrl(videoId, {
      start: options?.start,
      autoplay: options?.autoplay,
      controls: options?.showControls ?? true,
      modestBranding: true,
      showRelated: false,
      enableJsApi: true,
    });
  }

  /**
   * Import videos from a YouTube playlist
   */
  async importYouTubePlaylist(
    playlistUrl: string,
    courseId: string,
    userId: string,
  ): Promise<{
    imported: number;
    failed: number;
    videos: any[];
  }> {
    const validation = await this.youtubeProvider.validatePlaylist(playlistUrl);

    if (!validation.valid) {
      throw new NotFoundException(validation.error);
    }

    const playlistVideos = await this.youtubeProvider.getPlaylistVideos(playlistUrl, {
      maxResults: 100,
    });

    const results = {
      imported: 0,
      failed: 0,
      videos: [] as any[],
    };

    for (const item of playlistVideos.items) {
      const video = item.video;

      if (!video.embeddable) {
        results.failed++;
        continue;
      }

      results.videos.push({
        position: item.position,
        videoId: video.videoId,
        title: video.title,
        duration: video.durationSeconds,
        thumbnail: video.thumbnails.high || video.thumbnails.medium,
      });
      results.imported++;
    }

    return results;
  }

  // ============ ANALYTICS ============

  /**
   * Get analytics for a video
   */
  async getVideoAnalytics(
    assetId: string,
    dateRange: DateRange,
  ): Promise<VideoAnalytics> {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Video not found');
    }

    return this.videoProvider.getAnalytics(asset.providerAssetId, dateRange);
  }

  /**
   * Get playback logs for a video
   */
  async getPlaybackLogs(
    assetId: string,
    options?: {
      userId?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    return this.prisma.videoPlaybackLog.findMany({
      where: {
        videoAssetId: assetId,
        ...(options?.userId && { userId: options.userId }),
      },
      take: options?.limit || 50,
      ...(options?.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ WEBHOOKS ============

  /**
   * Handle webhook from video provider
   */
  async handleProviderWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string,
  ): Promise<void> {
    const event = this.videoProvider.verifyWebhook(payload, signature, secret);

    this.logger.log(`Received video webhook: ${event.type}`);

    switch (event.type) {
      case 'video.asset.ready':
        await this.handleAssetReady(event.assetId!, event.data);
        break;

      case 'video.asset.errored':
        await this.handleAssetError(event.assetId!, event.data);
        break;

      case 'video.subtitles.ready':
        await this.handleSubtitlesReady(event.assetId!, event.data);
        break;

      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  // ============ PRIVATE HELPERS ============

  private async handleAssetReady(providerAssetId: string, data: any): Promise<void> {
    const providerAsset = await this.videoProvider.getAsset(providerAssetId);

    if (!providerAsset) {
      this.logger.warn(`Asset not found in provider: ${providerAssetId}`);
      return;
    }

    await this.prisma.videoAsset.updateMany({
      where: {
        provider: this.videoProvider.providerName,
        providerAssetId,
      },
      data: {
        status: 'READY',
        duration: providerAsset.duration,
        aspectRatio: providerAsset.aspectRatio,
        resolutions: providerAsset.resolutions as any,
        thumbnails: providerAsset.thumbnails as any,
        thumbnailVttUrl: providerAsset.thumbnailVttUrl,
        processedAt: new Date(),
        providerMetadata: providerAsset.providerMetadata as any,
      },
    });

    this.logger.log(`Asset ready: ${providerAssetId}`);
  }

  private async handleAssetError(providerAssetId: string, data: any): Promise<void> {
    await this.prisma.videoAsset.updateMany({
      where: {
        provider: this.videoProvider.providerName,
        providerAssetId,
      },
      data: {
        status: 'ERRORED',
        errorMessage: data.error?.message || 'Processing failed',
      },
    });

    this.logger.error(`Asset processing failed: ${providerAssetId}`, data.error);
  }

  private async handleSubtitlesReady(providerAssetId: string, data: any): Promise<void> {
    const asset = await this.prisma.videoAsset.findFirst({
      where: {
        provider: this.videoProvider.providerName,
        providerAssetId,
      },
    });

    if (!asset) return;

    // The subtitle data structure depends on the provider
    if (data.track) {
      await this.prisma.videoSubtitle.upsert({
        where: {
          videoAssetId_language: {
            videoAssetId: asset.id,
            language: data.track.language_code || data.track.language,
          },
        },
        update: {
          url: data.track.url,
          label: data.track.name || data.track.label,
          autoGenerated: data.track.text_source === 'generated',
        },
        create: {
          videoAssetId: asset.id,
          language: data.track.language_code || data.track.language,
          label: data.track.name || data.track.label || 'Subtitles',
          url: data.track.url,
          autoGenerated: data.track.text_source === 'generated',
        },
      });
    }
  }

  private async logPlaybackStart(
    videoAssetId: string,
    userId: string,
    context: { ipAddress: string; sessionId: string },
  ): Promise<void> {
    // Find or create a playback log entry
    // In production, you'd want more sophisticated tracking
    await this.prisma.videoPlaybackLog.create({
      data: {
        videoAssetId,
        userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        startPosition: 0,
        endPosition: 0,
        watchedDuration: 0,
      },
    });
  }

  private mapProviderStatus(status: string): VideoAssetStatus {
    const statusMap: Record<string, VideoAssetStatus> = {
      preparing: 'PREPARING',
      uploading: 'UPLOADING',
      processing: 'PROCESSING',
      ready: 'READY',
      errored: 'ERRORED',
      deleted: 'DELETED',
    };

    return statusMap[status] || 'PROCESSING';
  }

  // ============ PROVIDER INFO ============

  /**
   * Get current provider information
   */
  getProviderInfo(): {
    name: string;
    supportsDrm: boolean;
    supportsAdaptiveStreaming: boolean;
    supportsLiveStreaming: boolean;
  } {
    return {
      name: this.videoProvider.providerName,
      supportsDrm: this.videoProvider.supportsDrm,
      supportsAdaptiveStreaming: this.videoProvider.supportsAdaptiveStreaming,
      supportsLiveStreaming: this.videoProvider.supportsLiveStreaming,
    };
  }
}
