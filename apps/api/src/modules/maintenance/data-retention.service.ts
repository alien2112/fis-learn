import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  constructor(private prisma: PrismaService) {}

  // Run daily at 4 AM UTC
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async runRetentionPolicies() {
    this.logger.log('Starting data retention cleanup...');

    const results = await Promise.allSettled([
      this.cleanupAnalyticsEvents(),
      this.cleanupVideoPlaybackLogs(),
      this.cleanupExpiredSessions(),
      this.cleanupExpiredVerificationTokens(),
      this.cleanupOldNotifications(),
      this.cleanupAuditLogs(),
      this.cleanupSoftDeletedCourses(),
    ]);

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.error(`Retention job ${index} failed:`, result.reason);
      }
    });

    this.logger.log('Data retention cleanup completed');
  }

  // Keep raw analytics events for 90 days
  private async cleanupAnalyticsEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.studentActivityEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Deleted ${result.count} analytics events older than 90 days`);
  }

  // Keep video playback logs for 90 days
  private async cleanupVideoPlaybackLogs() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    const result = await this.prisma.videoPlaybackLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Deleted ${result.count} video playback logs older than 90 days`);
  }

  // Clean up expired refresh tokens and sessions
  private async cleanupExpiredSessions() {
    const now = new Date();

    const [tokens, sessions] = await Promise.all([
      this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    this.logger.log(`Deleted ${tokens.count} expired tokens, ${sessions.count} expired sessions`);
  }

  // Clean up expired verification tokens (password reset, email verification, MFA setup)
  private async cleanupExpiredVerificationTokens() {
    const now = new Date();

    const result = await this.prisma.verificationToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { usedAt: { not: null }, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
    });

    this.logger.log(`Deleted ${result.count} expired/used verification tokens`);
  }

  // Keep audit logs for 365 days
  private async cleanupAuditLogs() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Deleted ${result.count} audit logs older than 365 days`);
  }

  // Hard-delete soft-deleted courses after 30 days
  private async cleanupSoftDeletedCourses() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const result = await this.prisma.course.deleteMany({
      where: {
        deletedAt: { lt: cutoff, not: null },
      },
    });

    this.logger.log(`Hard-deleted ${result.count} soft-deleted courses older than 30 days`);
  }

  // Keep read notifications for 30 days, unread for 90 days
  private async cleanupOldNotifications() {
    const readCutoff = new Date();
    readCutoff.setDate(readCutoff.getDate() - 30);

    const unreadCutoff = new Date();
    unreadCutoff.setDate(unreadCutoff.getDate() - 90);

    const [readResult, unreadResult] = await Promise.all([
      this.prisma.notification.deleteMany({
        where: { isRead: true, readAt: { lt: readCutoff } },
      }),
      this.prisma.notification.deleteMany({
        where: { isRead: false, createdAt: { lt: unreadCutoff } },
      }),
    ]);

    this.logger.log(
      `Deleted ${readResult.count} read notifications, ${unreadResult.count} old unread notifications`,
    );
  }
}
