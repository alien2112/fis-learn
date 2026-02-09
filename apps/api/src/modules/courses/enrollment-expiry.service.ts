import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EnrollmentStatus } from '@prisma/client';

/**
 * Enrollment Expiry Service
 *
 * Handles automatic expiration of enrollments based on:
 * - Access code expiry dates
 * - Subscription period ends
 *
 * Runs daily at 2 AM to process expired enrollments.
 */
@Injectable()
export class EnrollmentExpiryService {
  private readonly logger = new Logger(EnrollmentExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cron job that runs daily at 2:00 AM
   * Marks enrollments as EXPIRED where expiresAt < now AND status = ACTIVE
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleEnrollmentExpiry(): Promise<void> {
    this.logger.log('Starting enrollment expiry check...');

    try {
      const now = new Date();

      // Find all active enrollments that have expired
      const expiredEnrollments = await this.prisma.enrollment.findMany({
        where: {
          status: EnrollmentStatus.ACTIVE,
          expiresAt: {
            lt: now,
          },
        },
        select: {
          id: true,
          userId: true,
          courseId: true,
          expiresAt: true,
        },
      });

      if (expiredEnrollments.length === 0) {
        this.logger.log('No expired enrollments found');
        return;
      }

      this.logger.log(`Found ${expiredEnrollments.length} expired enrollments`);

      // Update all expired enrollments to EXPIRED status
      const result = await this.prisma.enrollment.updateMany({
        where: {
          id: {
            in: expiredEnrollments.map((e) => e.id),
          },
        },
        data: {
          status: EnrollmentStatus.EXPIRED,
        },
      });

      this.logger.log(
        `Successfully marked ${result.count} enrollments as EXPIRED`,
      );

      // Log details for audit trail
      for (const enrollment of expiredEnrollments) {
        this.logger.debug(
          `Enrollment expired: userId=${enrollment.userId}, courseId=${enrollment.courseId}, expiredAt=${enrollment.expiresAt?.toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process enrollment expiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Manually trigger enrollment expiry check
   * Useful for testing or admin operations
   */
  async manualExpiryCheck(): Promise<{ checked: number; expired: number }> {
    const now = new Date();

    const expiredEnrollments = await this.prisma.enrollment.findMany({
      where: {
        status: EnrollmentStatus.ACTIVE,
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (expiredEnrollments.length > 0) {
      await this.prisma.enrollment.updateMany({
        where: {
          id: {
            in: expiredEnrollments.map((e) => e.id),
          },
        },
        data: {
          status: EnrollmentStatus.EXPIRED,
        },
      });
    }

    return {
      checked: expiredEnrollments.length,
      expired: expiredEnrollments.length,
    };
  }
}
