import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserDataDeletionService {
  private readonly logger = new Logger(UserDataDeletionService.name);
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(private prisma: PrismaService) {}

  async requestDeletion(userId: string): Promise<{ scheduledDeletionDate: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.deletedAt) throw new BadRequestException('Deletion already requested');

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + this.GRACE_PERIOD_DAYS);

    // Soft delete with scheduled hard delete date
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        status: 'BANNED', // Prevent login
      },
    });

    // Invalidate all sessions
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    this.logger.log(`Deletion requested for user ${userId}, scheduled for ${scheduledDate.toISOString()}`);

    return { scheduledDeletionDate: scheduledDate };
  }

  async cancelDeletion(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.deletedAt) throw new BadRequestException('No pending deletion');

    // Check grace period hasn't expired
    const expiryDate = new Date(user.deletedAt);
    expiryDate.setDate(expiryDate.getDate() + this.GRACE_PERIOD_DAYS);

    if (new Date() > expiryDate) {
      throw new BadRequestException('Grace period has expired, deletion cannot be cancelled');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, status: 'ACTIVE' },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async processExpiredDeletions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.GRACE_PERIOD_DAYS);

    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deletedAt: { lte: cutoffDate },
      },
      select: { id: true, email: true },
    });

    for (const user of usersToDelete) {
      try {
        await this.hardDeleteUser(user.id);
        this.logger.log(`Hard deleted user ${user.id} (${user.email})`);
      } catch (error) {
        this.logger.error(`Failed to hard delete user ${user.id}`, error);
      }
    }

    if (usersToDelete.length > 0) {
      this.logger.log(`Processed ${usersToDelete.length} user deletions`);
    }
  }

  private async hardDeleteUser(userId: string): Promise<void> {
    // Delete in correct order to respect foreign key constraints
    await this.prisma.$transaction([
      this.prisma.lessonProgress.deleteMany({ where: { userId } }),
      this.prisma.studentVideoProgress.deleteMany({ where: { studentId: userId } }),
      this.prisma.studentActivityEvent.deleteMany({ where: { studentId: userId } }),
      this.prisma.studentDailyStat.deleteMany({ where: { studentId: userId } }),
      this.prisma.assessmentAttempt.deleteMany({ where: { studentId: userId } }),
      this.prisma.codeSubmission.deleteMany({ where: { userId } }),
      this.prisma.enrollment.deleteMany({ where: { userId } }),
      this.prisma.communityMessage.deleteMany({ where: { authorId: userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),
      this.prisma.subscription.deleteMany({ where: { userId } }),
      this.prisma.paymentTransaction.deleteMany({ where: { userId } }),
      this.prisma.paymentCustomer.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.verificationToken.deleteMany({ where: { userId } }),
      this.prisma.mfaBackupCode.deleteMany({ where: { userId } }),
      this.prisma.accessCodeUsage.deleteMany({ where: { userId } }),
      this.prisma.instructorProfile.deleteMany({ where: { userId } }),
      // Anonymize audit logs (keep for compliance but remove PII)
      this.prisma.auditLog.updateMany({
        where: { userId },
        data: { userId: 'DELETED_USER' },
      }),
      // Finally delete the user
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
