import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { CommunityGateway } from './community.gateway';
import { PrismaModule } from '@/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

const RedisAdapterProvider = {
  provide: 'REDIS_ADAPTER',
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('redis.url') || 'redis://localhost:6379';
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();
    return createAdapter(pubClient, subClient);
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [CommunityController],
  providers: [CommunityService, CommunityGateway, RedisAdapterProvider],
  exports: [CommunityService],
})
export class CommunityModule {}
