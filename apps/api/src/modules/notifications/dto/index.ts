import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum NotificationType {
  // Course
  COURSE_ENROLLED = 'COURSE_ENROLLED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  COURSE_UPDATED = 'COURSE_UPDATED',
  LESSON_REMINDER = 'LESSON_REMINDER',
  // Community
  COMMUNITY_REPLY = 'COMMUNITY_REPLY',
  COMMUNITY_MENTION = 'COMMUNITY_MENTION',
  MESSAGE_PINNED = 'MESSAGE_PINNED',
  // Live
  LIVE_CLASS_STARTING = 'LIVE_CLASS_STARTING',
  LIVE_CLASS_REMINDER = 'LIVE_CLASS_REMINDER',
  // Submissions
  SUBMISSION_GRADED = 'SUBMISSION_GRADED',
  ASSIGNMENT_FEEDBACK = 'ASSIGNMENT_FEEDBACK',
  // System
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  STREAK_MILESTONE = 'STREAK_MILESTONE',
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(1000)
  body: string;

  @IsOptional()
  data?: Record<string, any>;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  courseUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  communityReplies?: boolean;

  @IsOptional()
  @IsBoolean()
  liveClassAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  promotions?: boolean;
}
