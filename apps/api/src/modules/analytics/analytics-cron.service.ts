import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(private analyticsService: AnalyticsService) {}

  // Run daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleDailyAggregation() {
    this.logger.log('Starting daily analytics aggregation...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const result = await this.analyticsService.aggregateDailyStats(yesterday);
      this.logger.log(`Daily aggregation completed: ${result.aggregated}`);
    } catch (error) {
      this.logger.error('Daily aggregation failed:', error);
    }
  }

  // Run weekly on Sunday at 3 AM
  @Cron('0 3 * * 0')
  async handleWeeklyCleanup() {
    this.logger.log('Starting weekly cleanup of old events...');
    
    try {
      const result = await this.analyticsService.cleanupOldEvents();
      this.logger.log(`Weekly cleanup completed: ${result.deleted} events deleted`);
    } catch (error) {
      this.logger.error('Weekly cleanup failed:', error);
    }
  }
}
