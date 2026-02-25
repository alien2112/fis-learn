import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CommunityService } from './community.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthUser } from '@/modules/auth/types/jwt-payload.interface';
import { Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface JoinPayload {
  courseId: string;
  channelId: string;
}

interface SendPayload {
  channelId: string;
  body: string;
  parentId?: string;
  clientId?: string;
  lessonId?: string; // Optional lesson-level discussion
}

const gatewayOrigins = [
  process.env.WEB_URL || 'http://localhost:3010',
  process.env.ADMIN_URL || 'http://localhost:3004',
  // Support comma-separated extra origins (same as HTTP CORS config)
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
  // Always allow localhost variants in dev
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3010']
    : []),
];

@WebSocketGateway({
  namespace: '/community',
  cors: {
    origin: gatewayOrigins,
    credentials: true,
  },
})
export class CommunityGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CommunityGateway.name);
  private redisClient: Redis;

  constructor(
    private readonly communityService: CommunityService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_ADAPTER') private readonly redisAdapter: any,
  ) {
    // Create Redis client for rate limiting
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.redisClient = new Redis(redisUrl);
  }

  afterInit(server: Server) {
    // Attach Redis adapter for multi-instance scaling
    // When using a namespace gateway, Nest passes a Namespace here, not the root Server.
    const io = (server as any)?.server ?? server;
    if (typeof io?.adapter !== 'function') {
      this.logger.warn('Socket.io adapter not available; skipping Redis adapter attachment.');
      return;
    }
    io.adapter(this.redisAdapter);
  }

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticate(client);
      client.data.user = user;
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // No need to clean up Redis keys - they expire automatically
    // The rate limit bucket will expire after 10 seconds
  }

  private async authenticate(client: Socket): Promise<AuthUser> {
    let token: string | undefined;

    // 1. Prefer httpOnly cookie (most secure, not accessible to JS)
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]*)/);
      token = match ? match[1] : undefined;
    }

    // 2. Fall back to Authorization header
    if (!token) {
      const authHeader = client.handshake.headers?.authorization?.toString();
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    // 3. Last resort: auth payload (for mobile apps that can't use cookies)
    if (!token) {
      token = client.handshake.auth?.token;
    }

    if (!token) {
      throw new WsException('Unauthorized');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    const payload = this.jwtService.verify(token, { secret });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return user;
  }

  private channelRoom(channelId: string) {
    return `channel:${channelId}`;
  }

  private async allowMessage(userId: string): Promise<boolean> {
    const key = `rate:community:${userId}`;
    const windowSeconds = 10;
    const maxMessages = 15; // 15 messages per 10 seconds

    // Use a pipeline so INCR + EXPIRE are sent in a single RTT
    const [[, current]] = await this.redisClient
      .pipeline()
      .incr(key)
      .expire(key, windowSeconds, 'NX') // only set TTL on first increment
      .exec() as [[null, number], [null, number]];

    return current <= maxMessages;
  }

  @SubscribeMessage('community:join')
  async handleJoin(
    @MessageBody() payload: JoinPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthUser;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    if (!payload?.courseId || !payload?.channelId) {
      throw new WsException('Invalid payload');
    }

    const channel = await this.communityService.ensureChannelAccess(payload.channelId, user);
    if (channel.courseId !== payload.courseId) {
      throw new WsException('Invalid channel');
    }
    client.join(this.channelRoom(payload.channelId));

    return { ok: true };
  }

  @SubscribeMessage('community:send')
  async handleSend(
    @MessageBody() payload: SendPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user as AuthUser;
    if (!user) {
      return { ok: false, error: 'Unauthorized' };
    }

    try {
      if (!payload?.channelId || !payload?.body?.trim()) {
        return { ok: false, error: 'Invalid payload' };
      }

      const allowed = await this.allowMessage(user.id);
      if (!allowed) {
        return { ok: false, error: 'Slow down' };
      }

      const message = await this.communityService.createMessage(payload.channelId, user, payload);
      try {
        this.emitMessage(message, payload.clientId);
      } catch (emitErr: any) {
        this.logger.warn(`community:send broadcast failed (message saved): ${emitErr?.message}`);
      }
      return { ok: true, messageId: message.id, clientId: payload.clientId, message };
    } catch (err: any) {
      const message = err?.message || err?.response?.message || 'Failed to send message';
      this.logger.warn(`community:send failed: ${message}`);
      return { ok: false, error: typeof message === 'string' ? message : 'Failed to send message' };
    }
  }

  emitMessage(message: any, clientId?: string) {
    this.server
      .to(this.channelRoom(message.channelId))
      .emit('community:message', { message, clientId });
  }

  emitMessageUpdate(message: any) {
    this.server
      .to(this.channelRoom(message.channelId))
      .emit('community:message:update', { message });
  }
}
