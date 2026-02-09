import { Module, Global } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'SENTRY',
      useFactory: (config: ConfigService) => {
        const dsn = config.get<string>('SENTRY_DSN');
        if (!dsn) return null;

        Sentry.init({
          dsn,
          environment: config.get<string>('NODE_ENV') || 'development',
          tracesSampleRate: config.get<string>('NODE_ENV') === 'production' ? 0.1 : 1.0,
          // Don't send PII
          sendDefaultPii: false,
        });

        return Sentry;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['SENTRY'],
})
export class SentryModule {}
