import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: Array<string | number>;
}

/**
 * Generic retry service with exponential backoff and jitter.
 * Designed to be composed with CircuitBreakerService for layered resilience.
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options?: RetryOptions,
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const baseDelay = options?.baseDelay ?? 1000;
    const maxDelay = options?.maxDelay ?? 10000;
    const backoffFactor = options?.backoffFactor ?? 2;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) break;
        if (!this.isRetryable(error, options?.retryableErrors)) break;

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay,
        );
        const jitter = delay * 0.1 * Math.random();

        this.logger.warn(
          `${name}: Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(delay + jitter)}ms: ${lastError.message}`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      }
    }

    throw lastError!;
  }

  private isRetryable(
    error: any,
    retryableCodes?: Array<string | number>,
  ): boolean {
    // Network errors are always retryable
    if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code)) {
      return true;
    }
    // 5xx are retryable, 4xx are not
    const status = error.status || error.statusCode || error.response?.status;
    if (status >= 500) return true;
    if (status >= 400 && status < 500) return false;
    // Custom retryable codes
    if (retryableCodes?.includes(error.code)) return true;
    // Default: retry for unknown errors
    return true;
  }
}
