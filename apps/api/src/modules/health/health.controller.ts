import { Controller, Get, Injectable, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/decorators/public.decorator';
import { Response } from 'express';
import Redis from 'ioredis';

interface CheckResult {
  status: 'up' | 'down';
  responseTime: number;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    memory: CheckResult & { usedMB: number; totalMB: number };
    disk: CheckResult & { usedPercent?: number };
  };
}

@Injectable()
export class HealthService {
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000 });
    } catch {
      // Redis client will be null if connection fails
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memoryCheck = this.checkMemory();

    // Determine overall status
    let status: HealthStatus['status'] = 'healthy';
    if (dbCheck.status === 'down') {
      status = 'unhealthy'; // DB down = unhealthy (critical)
    } else if (redisCheck.status === 'down') {
      status = 'degraded'; // Redis down = degraded (non-fatal but bad)
    } else if (memoryCheck.status === 'down') {
      status = 'degraded'; // High memory = degraded
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        database: dbCheck,
        redis: redisCheck,
        memory: memoryCheck,
        disk: { status: 'up', responseTime: 0 }, // Basic placeholder
      },
    };
  }

  private async checkDatabase(): Promise<CheckResult> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', responseTime: Date.now() - start };
    } catch {
      return { status: 'down', responseTime: 0, details: { error: 'Connection failed' } };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    if (!this.redis) {
      return { status: 'down', responseTime: 0, details: { error: 'Redis client not initialized' } };
    }

    try {
      const start = Date.now();
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ]);
      return {
        status: pong === 'PONG' ? 'up' : 'down',
        responseTime: Date.now() - start,
      };
    } catch {
      return { status: 'down', responseTime: 0, details: { error: 'Ping failed' } };
    }
  }

  private checkMemory(): CheckResult & { usedMB: number; totalMB: number } {
    const used = process.memoryUsage();
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    const thresholdMB = parseInt(this.config.get<string>('HEALTH_MEMORY_THRESHOLD_MB') || '512', 10);

    return {
      status: usedMB < thresholdMB ? 'up' : 'down',
      responseTime: 0,
      usedMB,
      totalMB,
      details: { thresholdMB },
    };
  }

  checkLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  async checkReadiness() {
    const checks: string[] = [];
    let ready = true;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push('database: connected');
    } catch {
      checks.push('database: disconnected');
      ready = false;
    }

    try {
      if (this.redis) {
        await this.redis.ping();
        checks.push('redis: connected');
      } else {
        checks.push('redis: not configured');
        ready = false;
      }
    } catch {
      checks.push('redis: disconnected');
      ready = false;
    }

    return { status: ready ? 'ready' : 'not_ready', checks };
  }
}

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Full health check (DB, Redis, memory)' })
  @ApiResponse({ status: 200, description: 'Healthy or degraded' })
  @ApiResponse({ status: 503, description: 'Unhealthy' })
  async check(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.checkHealth();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    res.status(statusCode);
    return result;
  }

  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  liveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe (DB + Redis)' })
  @ApiResponse({ status: 200, description: 'Ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'Not ready' })
  async readiness(@Res({ passthrough: true }) res: Response) {
    const result = await this.healthService.checkReadiness();
    const statusCode = result.status === 'ready' ? 200 : 503;
    res.status(statusCode);
    return result;
  }
}
