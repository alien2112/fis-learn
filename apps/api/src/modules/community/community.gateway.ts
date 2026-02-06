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
import { Inject } from '@nestjs/common';
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
}

@WebSocketGateway({
  namespace: '/community',
  cors: {
    origin: [
      process.env.WEB_URL || 'http://localhost:3002',
      process.env.ADMIN_URL || 'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class CommunityGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

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
    server.adapter(this.redisAdapter);
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
    // Extract token from auth payload, Authorization header, or httpOnly cookie
    let token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.toString().replace('Bearer ', '');

    if (!token) {
      const cookieHeader = client.handshake.headers?.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]*)/);
        token = match ? match[1] : undefined;
      }
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
    const maxMessages = 6;

    const current = await this.redisClient.incr(key);
    if (current === 1) {
      // First message in window, set expiry
      await this.redisClient.expire(key, windowSeconds);
    }

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
      throw new WsException('Unauthorized');
    }

    if (!await this.allowMessage(user.id)) {
      throw new WsException('Slow down');
    }

    const message = await this.communityService.createMessage(payload.channelId, user, payload);
    this.emitMessage(message, payload.clientId);

    return { ok: true, messageId: message.id, clientId: payload.clientId };
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
