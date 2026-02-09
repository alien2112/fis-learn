import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { AnalyticsEventType } from '@prisma/client';

export class TrackEventDto {
  @ApiProperty({ enum: AnalyticsEventType, example: 'LESSON_COMPLETE' })
  @IsEnum(AnalyticsEventType, { message: 'Invalid event type' })
  eventType: AnalyticsEventType;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'Timestamp must be a valid ISO 8601 date string' })
  timestamp: string;

  @ApiProperty({ example: 'session-uuid-here' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[\w\-\.]+$/, { message: 'sessionId must only contain alphanumeric characters, hyphens, dots, and underscores' })
  sessionId: string;

  @ApiPropertyOptional({ example: 'course-uuid-here' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 'lesson-uuid-here' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ example: { timeSpent: 120 } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
