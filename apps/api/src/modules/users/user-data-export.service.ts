import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class UserDataExportService {
  private readonly logger = new Logger(UserDataExportService.name);

  constructor(private prisma: PrismaService) {}

  async exportUserData(userId: string) {
    const [
      user,
      enrollments,
      lessonProgress,
      notifications,
      subscriptions,
      transactions,
      codeSubmissions,
      communityMessages,
      analyticsEvents,
      auditLogs,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          locale: true,
          timezone: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          // Exclude: passwordHash, mfa secrets
        },
      }),
      this.prisma.enrollment.findMany({
        where: { userId },
        include: { course: { select: { title: true, slug: true } } },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId },
        include: { lesson: { select: { title: true } } },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, body: true, createdAt: true, isRead: true },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        include: { plan: { select: { name: true, tier: true } } },
      }),
      this.prisma.paymentTransaction.findMany({
        where: { userId },
        select: { amount: true, currency: true, status: true, createdAt: true, description: true },
      }),
      this.prisma.codeSubmission.findMany({
        where: { userId },
        select: { languageId: true, testsPassed: true, pointsEarned: true, status: true, createdAt: true },
      }),
      this.prisma.communityMessage.findMany({
        where: { authorId: userId },
        select: { body: true, createdAt: true, channelId: true },
      }),
      this.prisma.studentActivityEvent.findMany({
        where: { studentId: userId },
        select: { eventType: true, eventTimestamp: true, eventData: true },
        take: 10000, // Limit to prevent massive exports
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        select: { action: true, entityType: true, createdAt: true },
        take: 1000,
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user,
      enrollments,
      lessonProgress,
      notifications,
      subscriptions,
      transactions,
      codeSubmissions,
      communityMessages,
      analyticsEvents,
      auditLogs,
    };
  }
}
