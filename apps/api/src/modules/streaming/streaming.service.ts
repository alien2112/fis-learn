import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac } from 'crypto';

export interface ZegoTokenPayload {
  app_id: number;
  user_id: string;
  nonce: number;
  ctime: number;
  expire: number;
  payload?: string;
}

@Injectable()
export class StreamingService {
  private appId: number;
  private serverSecret: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.appId = parseInt(this.config.get('ZEGO_APP_ID', '0'), 10);
    this.serverSecret = this.config.get('ZEGO_SERVER_SECRET', '');
  }

  // Generate ZegoCloud token using server-assistant algorithm
  generateToken(roomId: string, userId: string, role: number = 0): string {
    if (!this.appId || !this.serverSecret) {
      throw new Error('ZegoCloud credentials not configured');
    }

    const nonce = Math.floor(Math.random() * 2147483647);
    const ctime = Math.floor(Date.now() / 1000);
    const expire = ctime + 3600; // 1 hour

    // Create token payload
    const payload: ZegoTokenPayload = {
      app_id: this.appId,
      user_id: userId,
      nonce: nonce,
      ctime: ctime,
      expire: expire,
    };

    // Generate token string
    const payloadStr = JSON.stringify(payload);
    const token = this.createToken(payloadStr, this.serverSecret);

    return token;
  }

  private createToken(payload: string, secret: string): string {
    // Simple HMAC-based token (Zego format approximation)
    const hash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const token = Buffer.from(`${payload}.${hash}`).toString('base64url');
    return token;
  }

  // Create a new stream
  async createStream(
    instructorId: string,
    courseId: string,
    title: string,
    scheduledAt?: Date,
  ) {
    // Generate unique room ID
    const roomId = `room_${courseId}_${Date.now()}`;

    const stream = await this.prisma.courseStream.create({
      data: {
        roomId,
        courseId,
        instructorId,
        title,
        scheduledAt,
        status: scheduledAt ? 'SCHEDULED' : 'LIVE',
      },
      include: {
        course: true,
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Generate instructor token
    const token = this.generateToken(roomId, instructorId, 1); // role 1 = host

    return {
      ...stream,
      token,
      appId: this.appId,
    };
  }

  // Get stream by ID
  async getStream(streamId: string, userId: string, isInstructor: boolean) {
    const stream = await this.prisma.courseStream.findUnique({
      where: { id: streamId },
      include: {
        course: true,
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        viewers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found');
    }

    // Check enrollment for non-instructors
    if (!isInstructor && stream.courseId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          userId,
          courseId: stream.courseId,
          status: 'ACTIVE',
        },
      });

      if (!enrollment) {
        throw new UnauthorizedException('You must be enrolled in this course to view the stream');
      }
    }

    // Generate appropriate token
    const role = isInstructor ? 1 : 0; // 1 = host, 0 = audience
    const token = this.generateToken(stream.roomId, userId, role);

    return {
      ...stream,
      token,
      appId: this.appId,
    };
  }

  // List streams for a course
  async listStreams(courseId: string) {
    return this.prisma.courseStream.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { viewers: true },
        },
      },
    });
  }

  // Update stream
  async updateStream(
    streamId: string,
    instructorId: string,
    data: { title?: string; status?: 'SCHEDULED' | 'LIVE' | 'ENDED'; scheduledAt?: Date },
  ) {
    const stream = await this.prisma.courseStream.findFirst({
      where: { id: streamId, instructorId },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found or you are not the instructor');
    }

    const updateData: any = { ...data };

    if (data.status === 'LIVE') {
      updateData.startedAt = new Date();
    } else if (data.status === 'ENDED') {
      updateData.endedAt = new Date();
    }

    return this.prisma.courseStream.update({
      where: { id: streamId },
      data: updateData,
    });
  }

  // Delete stream
  async deleteStream(streamId: string, instructorId: string, isAdmin: boolean) {
    const stream = await this.prisma.courseStream.findFirst({
      where: {
        id: streamId,
        ...(isAdmin ? {} : { instructorId }),
      },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found');
    }

    return this.prisma.courseStream.delete({
      where: { id: streamId },
    });
  }

  // Join stream (viewer)
  async joinStream(streamId: string, userId: string) {
    // Check if already joined
    const existingViewer = await this.prisma.streamViewer.findFirst({
      where: { streamId, userId },
    });

    if (existingViewer) {
      // Rejoin - update timestamp
      return this.prisma.streamViewer.update({
        where: { id: existingViewer.id },
        data: { rejoinedAt: new Date() },
      });
    }

    // Create new viewer record
    return this.prisma.streamViewer.create({
      data: {
        streamId,
        userId,
      },
    });
  }

  // Leave stream (viewer)
  async leaveStream(streamId: string, userId: string) {
    return this.prisma.streamViewer.updateMany({
      where: { streamId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });
  }

  // Get active streams
  async getActiveStreams() {
    return this.prisma.courseStream.findMany({
      where: { status: 'LIVE' },
      include: {
        course: true,
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { viewers: { where: { leftAt: null } } },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  // Get user's streams (for instructor dashboard)
  async getUserStreams(userId: string) {
    return this.prisma.courseStream.findMany({
      where: { instructorId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: true,
        _count: {
          select: { viewers: true },
        },
      },
    });
  }
}
