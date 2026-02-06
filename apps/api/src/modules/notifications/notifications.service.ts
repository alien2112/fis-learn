import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_SERVICE, EmailService } from '@/common/external-services';
import { NotificationType } from './dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(EMAIL_SERVICE) private emailService: EmailService,
    @Inject(forwardRef(() => NotificationsGateway))
    private gateway: NotificationsGateway,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });

    const prefs = await this.getOrCreatePreferences(userId);

    if (prefs.inAppEnabled) {
      this.gateway?.sendToUser(userId, notification);
    }

    if (prefs.emailEnabled) {
      this.sendEmailNotification(userId, title, body).catch((err) =>
        this.logger.error(`Failed to send email notification: ${err.message}`),
      );
    }

    this.gateway?.sendUnreadCount(userId, await this.getUnreadCount(userId));

    return notification;
  }

  async createBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (userIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
        data,
      })),
    });

    for (const userId of userIds) {
      this.gateway?.sendUnreadCount(userId, await this.getUnreadCount(userId));
    }
  }

  async getNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly?: boolean,
  ) {
    const skip = (page - 1) * limit;

    const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });

    this.gateway?.sendUnreadCount(userId, await this.getUnreadCount(userId));
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    this.gateway?.sendUnreadCount(userId, 0);
  }

  async delete(userId: string, notificationId: string) {
    await this.prisma.notification.delete({
      where: { id: notificationId, userId },
    });

    this.gateway?.sendUnreadCount(userId, await this.getUnreadCount(userId));
  }

  async getPreferences(userId: string) {
    return this.getOrCreatePreferences(userId);
  }

  async updatePreferences(
    userId: string,
    dto: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      inAppEnabled?: boolean;
      courseUpdates?: boolean;
      communityReplies?: boolean;
      liveClassAlerts?: boolean;
      promotions?: boolean;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  private async getOrCreatePreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  private async sendEmailNotification(
    userId: string,
    title: string,
    body: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    await this.emailService.sendEmail({
      to: user.email,
      subject: title,
      html: `<p>Hello ${user.name || 'there'},</p><p>${body}</p>`,
      text: `Hello ${user.name || 'there'},\n\n${body}`,
    });
  }
}
