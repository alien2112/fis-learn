import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUser } from '@/modules/auth/types/jwt-payload.interface';
import {
  CommunityChannelType,
  CommunityMessageStatus,
  CommunityModerationActionType,
  EnrollmentStatus,
  Role,
} from '@prisma/client';
import slugify from 'slugify';
import * as dompurify from 'isomorphic-dompurify';

const DEFAULT_CHANNELS = [
  {
    name: 'Announcements',
    slug: 'announcements',
    type: CommunityChannelType.ANNOUNCEMENTS,
  },
  {
    name: 'Q&A',
    slug: 'q-and-a',
    type: CommunityChannelType.QA,
  },
  {
    name: 'Discussion',
    slug: 'discussion',
    type: CommunityChannelType.DISCUSSION,
  },
];

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  private canModerate(role: Role) {
    return role === Role.INSTRUCTOR || role === Role.ADMIN || role === Role.SUPER_ADMIN;
  }

  private async ensureCourseAccess(courseId: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        createdById: true,
        instructors: { select: { userId: true } },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) {
      return course;
    }

    if (user.role === Role.INSTRUCTOR) {
      const isInstructor =
        course.createdById === user.id ||
        course.instructors.some((instructor) => instructor.userId === user.id);
      if (!isInstructor) {
        throw new ForbiddenException('Access denied to this course');
      }
      return course;
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        courseId,
        userId: user.id,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return course;
  }

  private async getChannelOrThrow(channelId: string) {
    const channel = await this.prisma.communityChannel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  async ensureChannelAccess(channelId: string, user: AuthUser) {
    const channel = await this.getChannelOrThrow(channelId);
    await this.ensureCourseAccess(channel.courseId, user);
    return channel;
  }

  async ensureDefaultChannels(courseId: string) {
    const existing = await this.prisma.communityChannel.count({
      where: { courseId },
    });
    if (existing > 0) {
      return;
    }

    await this.prisma.communityChannel.createMany({
      data: DEFAULT_CHANNELS.map((channel) => ({
        courseId,
        name: channel.name,
        slug: channel.slug,
        type: channel.type,
      })),
      skipDuplicates: true,
    });
  }

  async listChannels(courseId: string, user: AuthUser) {
    await this.ensureCourseAccess(courseId, user);
    await this.ensureDefaultChannels(courseId);

    return this.prisma.communityChannel.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createChannel(courseId: string, user: AuthUser, name: string, type: CommunityChannelType, slug?: string) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can create channels');
    }

    await this.ensureCourseAccess(courseId, user);

    const finalSlug = slug
      ? slugify(slug, { lower: true, strict: true })
      : slugify(name, { lower: true, strict: true });

    return this.prisma.communityChannel.create({
      data: {
        courseId,
        name,
        slug: finalSlug,
        type,
      },
    });
  }

  async listMessages(
    channelId: string,
    user: AuthUser,
    {
      cursor,
      limit = 30,
      parentId,
    }: { cursor?: string; limit?: number; parentId?: string },
  ) {
    const channel = await this.ensureChannelAccess(channelId, user);

    const statusFilter = this.canModerate(user.role)
      ? { not: CommunityMessageStatus.DELETED }
      : CommunityMessageStatus.ACTIVE;

    const messages = await this.prisma.communityMessage.findMany({
      where: {
        channelId,
        parentId: parentId ?? null,
        status: statusFilter,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    const hasNext = messages.length > limit;
    const data = hasNext ? messages.slice(0, limit) : messages;
    const nextCursor = hasNext ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor,
    };
  }

  async createMessage(
    channelId: string,
    user: AuthUser,
    {
      body,
      parentId,
      clientId,
    }: { body: string; parentId?: string; clientId?: string },
  ) {
    const cleanedBody = body?.trim();
    if (!cleanedBody) {
      throw new BadRequestException('Message cannot be empty');
    }
    
    // Sanitize HTML to prevent XSS attacks
    const sanitizedBody = dompurify.sanitize(cleanedBody, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
    const channel = await this.ensureChannelAccess(channelId, user);

    if (channel.isLocked && !this.canModerate(user.role)) {
      throw new ForbiddenException('This channel is locked');
    }

    if (
      channel.type === CommunityChannelType.ANNOUNCEMENTS &&
      !this.canModerate(user.role)
    ) {
      throw new ForbiddenException('Only instructors can post announcements');
    }

    if (
      channel.type === CommunityChannelType.ANNOUNCEMENTS &&
      parentId
    ) {
      throw new BadRequestException('Announcements do not support replies');
    }

    if (parentId) {
      const parent = await this.prisma.communityMessage.findUnique({
        where: { id: parentId },
        select: { id: true, channelId: true, parentId: true, isLocked: true },
      });

      if (!parent || parent.channelId !== channelId) {
        throw new BadRequestException('Invalid parent message');
      }

      if (parent.parentId) {
        throw new BadRequestException('Replies can only be one level deep');
      }

      if (parent.isLocked) {
        throw new ForbiddenException('This thread is locked');
      }
    }

    if (clientId) {
      const existing = await this.prisma.communityMessage.findFirst({
        where: {
          channelId,
          authorId: user.id,
          clientId,
        },
        include: {
          author: {
            select: { id: true, name: true, role: true, avatarUrl: true },
          },
          _count: {
            select: { replies: true },
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    return this.prisma.communityMessage.create({
      data: {
        courseId: channel.courseId,
        channelId,
        authorId: user.id,
        body: sanitizedBody,
        parentId: parentId ?? null,
        clientId,
      },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });
  }

  async pinMessage(messageId: string, user: AuthUser, value: boolean) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can pin messages');
    }

    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, courseId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureCourseAccess(message.courseId, user);

    const updated = await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { isPinned: value },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await this.prisma.communityModerationAction.create({
      data: {
        messageId,
        actorId: user.id,
        action: value ? CommunityModerationActionType.PIN : CommunityModerationActionType.UNPIN,
      },
    });

    return updated;
  }

  async markAnswer(messageId: string, user: AuthUser, value: boolean) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can mark answers');
    }

    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        courseId: true,
        channel: { select: { type: true } },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.channel.type !== CommunityChannelType.QA) {
      throw new BadRequestException('Answers can only be marked in Q&A');
    }

    await this.ensureCourseAccess(message.courseId, user);

    const updated = await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { isAnswer: value },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await this.prisma.communityModerationAction.create({
      data: {
        messageId,
        actorId: user.id,
        action: value ? CommunityModerationActionType.MARK_ANSWER : CommunityModerationActionType.UNMARK_ANSWER,
      },
    });

    return updated;
  }

  async reportMessage(messageId: string, user: AuthUser, reason?: string) {
    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { id: true, courseId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureCourseAccess(message.courseId, user);

    return this.prisma.communityMessageFlag.upsert({
      where: {
        messageId_reporterId: {
          messageId,
          reporterId: user.id,
        },
      },
      update: { reason },
      create: {
        messageId,
        reporterId: user.id,
        reason: dompurify.sanitize(reason, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre', 'p', 'br', 'ul', 'ol', 'li'],
          ALLOWED_ATTR: ['href', 'target', 'rel'],
        }),
      },
    });
  }

  async removeMessage(messageId: string, user: AuthUser) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can moderate messages');
    }

    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { id: true, courseId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureCourseAccess(message.courseId, user);

    const updated = await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { status: CommunityMessageStatus.HIDDEN },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await this.prisma.communityModerationAction.create({
      data: {
        messageId,
        actorId: user.id,
        action: CommunityModerationActionType.REMOVE,
      },
    });

    return updated;
  }

  async restoreMessage(messageId: string, user: AuthUser) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can moderate messages');
    }

    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { id: true, courseId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.ensureCourseAccess(message.courseId, user);

    const updated = await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { status: CommunityMessageStatus.ACTIVE },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await this.prisma.communityModerationAction.create({
      data: {
        messageId,
        actorId: user.id,
        action: CommunityModerationActionType.RESTORE,
      },
    });

    return updated;
  }

  async toggleThreadLock(messageId: string, user: AuthUser, value: boolean) {
    if (!this.canModerate(user.role)) {
      throw new ForbiddenException('Only instructors can lock threads');
    }

    const message = await this.prisma.communityMessage.findUnique({
      where: { id: messageId },
      select: { id: true, courseId: true, parentId: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.parentId) {
      throw new BadRequestException('Only root messages can be locked');
    }

    await this.ensureCourseAccess(message.courseId, user);

    const updated = await this.prisma.communityMessage.update({
      where: { id: messageId },
      data: { isLocked: value },
      include: {
        author: {
          select: { id: true, name: true, role: true, avatarUrl: true },
        },
        _count: { select: { replies: true } },
      },
    });

    await this.prisma.communityModerationAction.create({
      data: {
        messageId,
        actorId: user.id,
        action: value
          ? CommunityModerationActionType.LOCK_THREAD
          : CommunityModerationActionType.UNLOCK_THREAD,
      },
    });

    return updated;
  }
}
