import {
  CacheInterceptor as NestCacheInterceptor,
  CACHE_MANAGER,
} from '@nestjs/cache-manager';
import {
  ExecutionContext,
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';

@Injectable()
export class CacheInterceptor extends NestCacheInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only cache GET requests
    if (method !== 'GET') {
      return undefined;
    }

    // Create cache key from URL + query params
    const url = request.url;
    const query = JSON.stringify(request.query);
    const key = `${url}?${query}`;

    this.logger.debug(`Cache key: ${key}`);
    return key;
  }
}
