import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsCronService } from './analytics-cron.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { CoursesModule } from '@/modules/courses/courses.module';

@Module({
  imports: [PrismaModule, CoursesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsCronService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
