import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { WsException } from '@nestjs/websockets';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: [
      process.env.WEB_URL || 'http://localhost:3002',
      process.env.ADMIN_URL || 'http://localhost:3000',
    ],
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticate(client);
      client.data.userId = user.id;
      client.join(`user:${user.id}`);

      const unreadCount = await this.prisma.notification.count({
        where: { userId: user.id, isRead: false },
      });
      client.emit('notification:count', { count: unreadCount });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      client.leave(`user:${client.data.userId}`);
    }
  }

  private async authenticate(client: Socket) {
    let token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.toString().replace('Bearer ', '');

    if (!token) {
      const cookieHeader = client.handshake.headers?.cookie;
      if (cookieHeader) {
        const match = cookieHeader.match(/(?:^|; s*)accessToken=([^;]*)/);
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
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new WsException('Unauthorized');
    }

    return user;
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('notification:count', { count });
  }
}
