import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { StreamingModule } from './modules/streaming/streaming.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { ConsentModule } from './modules/consent/consent.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { ResilienceModule } from './common/resilience/resilience.module';
import { StorageModule } from './common/storage/storage.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { SubscriptionThrottleGuard } from './common/guards/subscription-throttle.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { CommonModule } from './common/common.module';
import { QueueModule } from './common/queue/queue.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      // Allow local overrides (e.g. local Docker Postgres) without changing committed `.env`.
      envFilePath: ['../../.env.local', '../../.env'],
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

    // Common services (AuditLogService, etc.)
    CommonModule,

    // Queue infrastructure for async operations
    QueueModule,

    // Scheduling for cron jobs
    ScheduleModule.forRoot(),

    // Caching layer - in-memory with 1 min default TTL
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000, // 1 minute default
      max: 1000,      // max items in cache
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
    StreamingModule,
    ChatbotModule,
    NotificationsModule,
    MaintenanceModule,
    ConsentModule,
    AuditLogsModule,
    SiteSettingsModule,

    // Infrastructure modules
    ResilienceModule,
    StorageModule,

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
    // Global CSRF protection (double-submit cookie)
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
