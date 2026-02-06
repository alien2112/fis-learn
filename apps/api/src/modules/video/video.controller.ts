import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { VideoService } from './video.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';
import {
  CreateDirectUploadDto,
  UploadFromUrlDto,
  UpdateVideoAssetDto,
  ValidateYouTubeDto,
  GetYouTubeEmbedDto,
  ImportYouTubePlaylistDto,
  GetPlaybackDto,
  ListAssetsQueryDto,
  GetAnalyticsQueryDto,
} from './dto';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

@ApiTags('Video')
@ApiBearerAuth()
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  // ============ PROVIDER INFO ============

  @Get('provider')
  @ApiOperation({ summary: 'Get current video provider information' })
  getProviderInfo() {
    return this.videoService.getProviderInfo();
  }

  // ============ VIDEO UPLOAD ============

  @Post('upload/direct')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a direct upload URL for client-side uploads' })
  @ApiResponse({ status: 201, description: 'Upload URL created successfully' })
  async createDirectUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDirectUploadDto,
  ) {
    return this.videoService.createDirectUpload(user.id, {
      title: dto.title,
      description: dto.description,
      folderId: dto.folderId,
      enableDrm: dto.enableDrm,
      enableWatermark: dto.enableWatermark,
    });
  }

  @Post('upload/url')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Upload a video from a URL' })
  @ApiResponse({ status: 201, description: 'Video upload initiated' })
  async uploadFromUrl(
    @CurrentUser() user: AuthUser,
    @Body() dto: UploadFromUrlDto,
  ) {
    return this.videoService.uploadFromUrl(user.id, dto.url, {
      title: dto.title,
      description: dto.description,
      folderId: dto.folderId,
    });
  }

  // ============ ASSET MANAGEMENT ============

  @Get('assets')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'List video assets' })
  async listAssets(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAssetsQueryDto,
  ) {
    return this.videoService.listAssets(user.id, {
      status: query.status,
      folderId: query.folderId,
      limit: query.limit,
      cursor: query.cursor,
    });
  }

  @Get('assets/:id')
  @ApiOperation({ summary: 'Get a video asset by ID' })
  @ApiResponse({ status: 200, description: 'Video asset found' })
  @ApiResponse({ status: 404, description: 'Video asset not found' })
  async getAsset(@Param('id') id: string) {
    return this.videoService.getAsset(id);
  }

  @Patch('assets/:id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Update a video asset' })
  async updateAsset(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVideoAssetDto,
  ) {
    return this.videoService.updateAsset(id, user.id, dto);
  }

  @Delete('assets/:id')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a video asset' })
  async deleteAsset(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    await this.videoService.deleteAsset(id, user.id, isAdmin);
  }

  // ============ PLAYBACK ============

  @Post('assets/:id/playback')
  @ApiOperation({ summary: 'Get playback manifest for a video' })
  @ApiResponse({ status: 200, description: 'Playback manifest generated' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 403, description: 'Video not ready or access denied' })
  async getPlaybackManifest(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: GetPlaybackDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';

    return this.videoService.getPlaybackManifest(
      id,
      { id: user.id, email: user.email },
      {
        ipAddress,
        sessionId: dto.sessionId,
        deviceFingerprint: dto.deviceFingerprint,
      },
    );
  }

  // ============ YOUTUBE INTEGRATION ============

  @Post('youtube/validate')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Validate a YouTube video URL' })
  @ApiResponse({
    status: 200,
    description: 'Validation result with limitations warning',
  })
  async validateYouTubeVideo(@Body() dto: ValidateYouTubeDto) {
    return this.videoService.validateYouTubeVideo(dto.url);
  }

  @Post('youtube/embed')
  @ApiOperation({ summary: 'Get YouTube embed URL' })
  async getYouTubeEmbed(@Body() dto: GetYouTubeEmbedDto) {
    return this.videoService.getYouTubeEmbedUrl(dto.url, {
      start: dto.start,
      autoplay: dto.autoplay,
      showControls: dto.showControls,
    });
  }

  @Post('youtube/import-playlist')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Import videos from a YouTube playlist' })
  @ApiResponse({
    status: 200,
    description: 'List of videos from playlist ready for import',
  })
  async importYouTubePlaylist(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportYouTubePlaylistDto,
  ) {
    return this.videoService.importYouTubePlaylist(
      dto.playlistUrl,
      dto.courseId,
      user.id,
    );
  }

  // ============ ANALYTICS ============

  @Get('assets/:id/analytics')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get analytics for a video' })
  async getVideoAnalytics(
    @Param('id') id: string,
    @Query() query: GetAnalyticsQueryDto,
  ) {
    return this.videoService.getVideoAnalytics(id, {
      start: query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: query.endDate ? new Date(query.endDate) : new Date(),
    });
  }

  @Get('assets/:id/playback-logs')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Get playback logs for a video' })
  async getPlaybackLogs(
    @Param('id') id: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.videoService.getPlaybackLogs(id, {
      userId,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      cursor,
    });
  }

  // ============ WEBHOOKS ============

  @Post('webhooks/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle video provider webhooks' })
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('mux-signature') muxSignature: string,
    @Headers('x-webhook-signature') genericSignature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const signature = muxSignature || genericSignature;

    if (!signature) {
      return { received: true, processed: false, reason: 'No signature' };
    }

    // Get webhook secret from environment based on provider
    const secretEnvKey = `${provider.toUpperCase().replace('-', '_')}_WEBHOOK_SECRET`;
    const secret = process.env[secretEnvKey];

    if (!secret) {
      return { received: true, processed: false, reason: 'No secret configured' };
    }

    const payload = req.rawBody || JSON.stringify(req.body);

    try {
      await this.videoService.handleProviderWebhook(payload, signature, secret);
      return { received: true, processed: true };
    } catch (error: any) {
      return { received: true, processed: false, error: error.message };
    }
  }
}
