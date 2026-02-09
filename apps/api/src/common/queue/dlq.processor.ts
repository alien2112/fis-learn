import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { DEAD_LETTER_QUEUE } from './queue.module';

/**
 * Dead Letter Queue processor.
 * Logs failed jobs for monitoring/alerting. Can be extended to send
 * notifications via Sentry, email, or webhooks.
 */
@Injectable()
export class DlqProcessor implements OnModuleInit {
  private readonly logger = new Logger(DlqProcessor.name);
  private worker: Worker | null = null;

  constructor(
    @Inject(DEAD_LETTER_QUEUE) private dlq: Queue,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl =
      this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    this.worker = new Worker(
      'dead-letter',
      async (job) => {
        this.logger.error(`DLQ item: ${job.name}`, {
          id: job.id,
          originalQueue: job.data?.originalQueue,
          originalJobName: job.data?.originalJobName,
          failedReason: job.data?.failedReason,
          attemptsMade: job.data?.attemptsMade,
          failedAt: job.data?.failedAt,
        });
      },
      { connection: { url: redisUrl } },
    );
  }

  async moveToDlq(originalQueue: string, jobName: string, jobData: any, failedReason: string, attemptsMade: number) {
    await this.dlq.add('failed-job', {
      originalQueue,
      originalJobName: jobName,
      data: jobData,
      failedReason,
      attemptsMade,
      failedAt: new Date().toISOString(),
    });
  }
}
