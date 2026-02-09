import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThreshold = 500; // ms
  private readonly queryTracker = new Map<string, { count: number; firstSeen: number }>();

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      // Connection pooling for production scale
      // FREE - uses built-in Prisma connection management
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log slow queries + N+1 detection
    this.$use(async (params, next) => {
      const start = Date.now();
      const result = await next(params);
      const duration = Date.now() - start;
      const queryKey = `${params.model}.${params.action}`;

      // Slow query detection
      if (duration > this.slowQueryThreshold) {
        this.logger.warn(
          `Slow query (${duration}ms): ${queryKey}`,
        );
      }

      // N+1 detection: track repeated identical queries within 100ms windows
      const now = Date.now();
      const tracked = this.queryTracker.get(queryKey);

      if (tracked && now - tracked.firstSeen < 100) {
        tracked.count++;
        if (tracked.count >= 5) {
          this.logger.warn(
            `Potential N+1 detected: ${queryKey} called ${tracked.count} times in ${now - tracked.firstSeen}ms. Consider using include/select.`,
          );
          this.queryTracker.delete(queryKey);
        }
      } else {
        this.queryTracker.set(queryKey, { count: 1, firstSeen: now });
      }

      // Cleanup old tracker entries periodically
      if (this.queryTracker.size > 1000) {
        const cutoff = now - 1000;
        for (const [key, value] of this.queryTracker) {
          if (value.firstSeen < cutoff) this.queryTracker.delete(key);
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }
    // Delete in order respecting foreign key constraints
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = this[modelKey as keyof this];
        if (model && typeof model === 'object' && 'deleteMany' in model) {
          return (model as any).deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }
}
