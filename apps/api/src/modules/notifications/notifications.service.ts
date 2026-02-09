import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EMAIL_SERVICE, EmailService } from '@/common/external-services';
import { NotificationType } from './dto';
import { NotificationsGateway } from './notifications.gateway';
import { SendBulkNotificationDto } from './dto/send-bulk-notification.dto';
import { Role } from '@prisma/client';

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
    if (userIds.length === 0) return { count: 0, notifications: [] };

    // Prevent abuse: limit bulk notification size
    const MAX_BULK_SIZE = 10000;
    if (userIds.length > MAX_BULK_SIZE) {
      throw new BadRequestException(
        `Bulk notification limit is ${MAX_BULK_SIZE} users. Received: ${userIds.length}`
      );
    }

    this.logger.log(`Creating bulk notifications for ${userIds.length} users, type: ${type}`);

    // Create notifications in a transaction to get the created records
    const notifications = await this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: { userId, type, title, body, data },
        }),
      ),
    );

    // Batch update unread counts using Promise.all with batching to prevent memory issues
    const BATCH_SIZE = 100;
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (userId) =>
          this.gateway?.sendUnreadCount(userId, await this.getUnreadCount(userId)),
        ),
      );
    }

    return { count: notifications.length, notifications };
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

    // Escape HTML to prevent injection attacks
    const safeName = this.escapeHtml(user.name || 'there');
    const safeBody = this.escapeHtml(body);

    await this.emailService.sendEmail({
      to: user.email,
      subject: title,
      html: `<p>Hello ${safeName},</p><p>${safeBody}</p>`,
      text: `Hello ${user.name || 'there'},\n\n${body}`,
    });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async sendBulkNotification(adminUserId: string, dto: SendBulkNotificationDto) {
    // Get recipient IDs based on group
    let recipientIds: string[];

    if (dto.recipientGroup === 'CUSTOM') {
      if (!dto.recipientIds || dto.recipientIds.length === 0) {
        throw new BadRequestException('recipientIds is required for CUSTOM recipient group');
      }
      recipientIds = dto.recipientIds;
    } else {
      // Query users based on group
      const whereClause: any = { status: 'ACTIVE' };

      if (dto.recipientGroup === 'ALL_STUDENTS') {
        whereClause.role = Role.STUDENT;
      } else if (dto.recipientGroup === 'ALL_INSTRUCTORS') {
        whereClause.role = Role.INSTRUCTOR;
      } else if (dto.recipientGroup === 'ALL_ADMINS') {
        whereClause.role = { in: [Role.ADMIN, Role.SUPER_ADMIN] };
      }
      // ALL_USERS: no additional filter

      const users = await this.prisma.user.findMany({
        where: whereClause,
        select: { id: true },
      });

      recipientIds = users.map((u) => u.id);
    }

    if (recipientIds.length === 0) {
      throw new BadRequestException('No recipients found for the specified group');
    }

    if (recipientIds.length > 10000) {
      throw new BadRequestException('Cannot send to more than 10,000 recipients at once');
    }

    // Create bulk notification record
    const bulkNotification = await this.prisma.bulkNotification.create({
      data: {
        subject: dto.subject,
        message: dto.message,
        type: dto.type,
        recipientGroup: dto.recipientGroup,
        recipientIds: dto.recipientGroup === 'CUSTOM' ? recipientIds : [],
        sentBy: adminUserId,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        recipientCount: recipientIds.length,
        status: dto.scheduledFor ? 'PENDING' : 'PROCESSING',
      },
    });

    // If not scheduled, send immediately
    if (!dto.scheduledFor) {
      // Send notifications asynchronously (fire and forget)
      this.sendBulkNotificationsAsync(bulkNotification.id, recipientIds, dto.subject, dto.message, dto.type as any)
        .catch((error) => {
          this.logger.error(`Failed to send bulk notifications: ${error.message}`);
        });
    }

    return {
      id: bulkNotification.id,
      recipientCount: recipientIds.length,
      status: bulkNotification.status,
      message: dto.scheduledFor
        ? `Notification scheduled for ${dto.scheduledFor}`
        : 'Notification is being sent',
    };
  }

  private async sendBulkNotificationsAsync(
    bulkNotificationId: string,
    recipientIds: string[],
    title: string,
    body: string,
    type: NotificationType,
  ) {
    try {
      // Send in batches to avoid overwhelming the database
      const batchSize = 100;
      let deliveredCount = 0;

      for (let i = 0; i < recipientIds.length; i += batchSize) {
        const batch = recipientIds.slice(i, i + batchSize);

        // Create notifications for batch
        await this.createBulk(batch, type, title, body);
        deliveredCount += batch.length;

        // Update progress
        await this.prisma.bulkNotification.update({
          where: { id: bulkNotificationId },
          data: { deliveredCount },
        });
      }

      // Mark as completed
      await this.prisma.bulkNotification.update({
        where: { id: bulkNotificationId },
        data: {
          status: 'COMPLETED',
          deliveredCount,
        },
      });

      this.logger.log(`Bulk notification ${bulkNotificationId} sent to ${deliveredCount} users`);
    } catch (error) {
      this.logger.error(`Error sending bulk notifications: ${error.message}`);

      // Mark as failed
      await this.prisma.bulkNotification.update({
        where: { id: bulkNotificationId },
        data: { status: 'FAILED' },
      });
    }
  }

  async getBulkHistory(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bulkNotifications, total] = await Promise.all([
      this.prisma.bulkNotification.findMany({
        skip,
        take: limit,
        include: {
          sentByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.bulkNotification.count(),
    ]);

    return {
      data: bulkNotifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
