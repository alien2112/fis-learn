import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { NotificationType } from '@prisma/client';

export class SendBulkNotificationDto {
  @ApiProperty({ description: 'Notification subject/title' })
  @IsString()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  @MaxLength(5000)
  message: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Recipient group',
    enum: ['ALL_USERS', 'ALL_STUDENTS', 'ALL_INSTRUCTORS', 'ALL_ADMINS', 'CUSTOM'],
  })
  @IsString()
  recipientGroup: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs (required if recipientGroup is CUSTOM)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipientIds?: string[];

  @ApiPropertyOptional({
    description: 'Schedule notification for later (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
