import { Controller, Get, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; responseTime: number };
    redis?: { status: 'up' | 'down'; responseTime: number };
    memory: { status: 'up' | 'down'; used: number; total: number };
  };
}

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    // Check database
    let dbStatus: 'up' | 'down' = 'down';
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
      dbStatus = 'up';
    } catch {
      dbStatus = 'down';
    }

    // Check memory
    const used = process.memoryUsage();
    const memStatus = used.heapUsed < 1024 * 1024 * 512 ? 'up' : 'down'; // Alert if > 512MB

    const overallStatus = dbStatus === 'down' ? 'unhealthy' : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: { status: dbStatus, responseTime: dbResponseTime },
        memory: {
          status: memStatus,
          used: Math.round(used.heapUsed / 1024 / 1024), // MB
          total: Math.round(used.heapTotal / 1024 / 1024),
        },
      },
    };
  }

  checkLiveness(): { status: 'alive'; timestamp: string } {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<{ status: 'ready' | 'not_ready'; checks: string[] }> {
    const checks: string[] = [];
    let ready = true;

    // Check DB
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push('database: connected');
    } catch {
      checks.push('database: disconnected');
      ready = false;
    }

    return {
      status: ready ? 'ready' : 'not_ready',
      checks,
    };
  }
}

@Controller('health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async check() {
    const result = await this.healthService.checkHealth();
    const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503;
    return { ...result, statusCode };
  }

  @Get('live')
  liveness() {
    return this.healthService.checkLiveness();
  }

  @Get('ready')
  async readiness() {
    const result = await this.healthService.checkReadiness();
    const statusCode = result.status === 'ready' ? 200 : 503;
    return { ...result, statusCode };
  }
}
