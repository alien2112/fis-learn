import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CoursesModule } from './modules/courses/courses.module';
import { AccessCodesModule } from './modules/access-codes/access-codes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CommunityModule } from './modules/community/community.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { MfaModule } from './modules/mfa/mfa.module';
import { VideoModule } from './modules/video/video.module';
import { CodeExecutionModule } from './modules/code-execution/code-execution.module';
import { HealthModule } from './modules/health/health.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SkillTreesModule } from './modules/skill-trees/skill-trees.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { SubscriptionThrottleGuard } from './common/guards/subscription-throttle.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      load: [configuration],
    }),

    // Rate limiting (base config, overridden by SubscriptionThrottleGuard)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute (default)
      },
    ]),

    // Database
    PrismaModule,

    // Scheduling for cron jobs
    ScheduleModule.forRoot(),

    // Caching layer - in-memory with 5 min default TTL
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: 60 * 1000, // 1 minute default
        max: 1000, // max items in cache
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    CategoriesModule,
    CoursesModule,
    AccessCodesModule,
    DashboardModule,
    CommunityModule,
    SubscriptionsModule,
    MfaModule,
    HealthModule,
    AnalyticsModule,
    SkillTreesModule,
    // StreamingModule, // TODO: Add back after prisma migrate

    // Media & Content modules (provider-agnostic)
    VideoModule.forRoot(),
    CodeExecutionModule.forRoot(),
  ],
  controllers: [],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global caching for GET requests
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    // Global logging with correlation IDs
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global rate limiting (subscription-aware)
    {
      provide: APP_GUARD,
      useClass: SubscriptionThrottleGuard,
    },
    // Global JWT authentication guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
