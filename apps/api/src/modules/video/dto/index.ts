import { IsString, IsOptional, IsBoolean, IsUrl, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoAssetStatus } from '@prisma/client';
import { Type } from 'class-transformer';

// ============ UPLOAD DTOs ============

export class CreateDirectUploadDto {
  @ApiProperty({ description: 'Title for the video' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Folder ID to organize the video' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Enable DRM protection (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableDrm?: boolean;

  @ApiPropertyOptional({
    description: 'Enable watermarking (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableWatermark?: boolean;
}

export class UploadFromUrlDto {
  @ApiProperty({ description: 'URL of the video to upload' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Title for the video' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Optional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Folder ID to organize the video' })
  @IsOptional()
  @IsString()
  folderId?: string;
}

// ============ ASSET DTOs ============

export class UpdateVideoAssetDto {
  @ApiPropertyOptional({ description: 'New title for the video' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'New description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Move to a different folder' })
  @IsOptional()
  @IsString()
  folderId?: string;
}

export class ListAssetsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['PREPARING', 'UPLOADING', 'PROCESSING', 'READY', 'ERRORED', 'DELETED'],
  })
  @IsOptional()
  @IsEnum(VideoAssetStatus)
  status?: VideoAssetStatus;

  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

// ============ PLAYBACK DTOs ============

export class GetPlaybackDto {
  @ApiProperty({ description: 'Unique session ID for concurrent stream tracking' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Device fingerprint for security' })
  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

// ============ YOUTUBE DTOs ============

export class ValidateYouTubeDto {
  @ApiProperty({
    description: 'YouTube video URL or video ID',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  url: string;
}

export class GetYouTubeEmbedDto {
  @ApiProperty({
    description: 'YouTube video URL or video ID',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Start time in seconds',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  start?: number;

  @ApiPropertyOptional({
    description: 'Auto-play video (requires muted)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;

  @ApiPropertyOptional({
    description: 'Show player controls',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showControls?: boolean;
}

export class ImportYouTubePlaylistDto {
  @ApiProperty({
    description: 'YouTube playlist URL',
    example: 'https://www.youtube.com/playlist?list=PLxxxxxxxx',
  })
  @IsString()
  playlistUrl: string;

  @ApiProperty({ description: 'Course ID to import videos into' })
  @IsString()
  courseId: string;
}

// ============ ANALYTICS DTOs ============

export class GetAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for analytics (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for analytics (ISO 8601)',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
