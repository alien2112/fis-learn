import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { redactUrl } from '../utils/pii-redactor';

interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Structured logging with correlation IDs
 * 
 * This interceptor adds:
 * - Correlation ID for tracing requests across logs
 * - Structured JSON logging
 * - Performance timing
 * - User context
 * 
 * Cost: FREE - just code
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly slowRequestThreshold = 500; // ms - adjust based on your SLA

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip logging for non-HTTP contexts (WebSocket, RPC) to avoid calling
    // HTTP-only methods like setHeader on a socket object.
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse();

    // Generate or use existing correlation ID
    const correlationId = (request.headers['x-correlation-id'] as string) || randomUUID();
    request.id = correlationId;
    request.startTime = Date.now();

    // Add correlation ID to response headers
    response.setHeader('X-Correlation-ID', correlationId);
    // Add timing headers for debugging
    response.setHeader('X-Request-Start', request.startTime.toString());

    const { method } = request;
    const url = redactUrl(request.url);
    const userAgent = request.get('user-agent') || 'unknown';
    const userId = (request as any).user?.id || 'anonymous';

    // Skip logging for liveness/readiness probes
    const skipPaths = ['/api/v1/health/live', '/api/v1/health/ready'];
    if (skipPaths.some((p) => request.url.startsWith(p))) {
      return next.handle();
    }

    // Sample logging for high-traffic paths (log 1% of health checks)
    const samplePaths: Record<string, number> = {
      '/api/v1/health': 0.01,
    };
    const sampleRate = Object.entries(samplePaths).find(([p]) => request.url.startsWith(p))?.[1];
    if (sampleRate && Math.random() > sampleRate) {
      return next.handle().pipe(
        tap(() => {
          const duration = Date.now() - (request.startTime || 0);
          response.setHeader('X-Response-Time', `${duration}ms`);
        }),
      );
    }

    // Log request start
    this.logger.log({
      message: 'Request started',
      correlationId,
      method,
      url,
      userId,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - (request.startTime || 0);
          const statusCode = response.statusCode;

          const logData = {
            message: duration > this.slowRequestThreshold ? 'SLOW REQUEST DETECTED' : 'Request completed',
            correlationId,
            method,
            url,
            statusCode,
            duration,
            userId,
            timestamp: new Date().toISOString(),
          };

          if (duration > this.slowRequestThreshold) {
            this.logger.warn({
              ...logData,
              threshold: this.slowRequestThreshold,
              suggestion: 'Consider optimizing this endpoint',
            });
          } else if (statusCode >= 500) {
            this.logger.error(logData);
          } else if (statusCode >= 400) {
            this.logger.warn(logData);
          } else {
            this.logger.log(logData);
          }

          // Add duration header for client-side debugging
          response.setHeader('X-Response-Time', `${duration}ms`);
        },
        error: (error) => {
          const duration = Date.now() - (request.startTime || 0);

          this.logger.error({
            message: 'Request failed',
            correlationId,
            method,
            url,
            error: error.message,
            stack: error.stack,
            duration,
            userId,
            timestamp: new Date().toISOString(),
          });

          response.setHeader('X-Response-Time', `${duration}ms`);
        },
      }),
    );
  }
}
