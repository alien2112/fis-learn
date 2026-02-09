import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DlqProcessor } from './dlq.processor';

export const EMAIL_QUEUE = 'EMAIL_QUEUE';
export const NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE';
export const DEAD_LETTER_QUEUE = 'DEAD_LETTER_QUEUE';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Queue('email', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: NOTIFICATION_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Queue('notification', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 500,
            attempts: 2,
            backoff: { type: 'exponential', delay: 1000 },
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: DEAD_LETTER_QUEUE,
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL') || 'redis://localhost:6379';
        return new Queue('dead-letter', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            removeOnComplete: false,
            removeOnFail: false,
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: DlqProcessor,
      useFactory: (dlq: Queue, config: ConfigService) => {
        return new DlqProcessor(dlq, config);
      },
      inject: [DEAD_LETTER_QUEUE, ConfigService],
    },
  ],
  exports: [EMAIL_QUEUE, NOTIFICATION_QUEUE, DEAD_LETTER_QUEUE, DlqProcessor],
})
export class QueueModule {}
