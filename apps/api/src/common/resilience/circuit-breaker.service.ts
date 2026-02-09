import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

interface CircuitBreakerOptions {
  timeout?: number;     // ms before request is considered failed
  errorThresholdPercentage?: number; // % of failures to open circuit
  resetTimeout?: number; // ms before trying again (half-open)
  volumeThreshold?: number; // minimum requests before evaluating
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breakers = new Map<string, CircuitBreaker>();

  create<T>(
    name: string,
    fn: (...args: any[]) => Promise<T>,
    options?: CircuitBreakerOptions,
  ): CircuitBreaker {
    const breaker = new CircuitBreaker(fn, {
      timeout: options?.timeout ?? 10000,
      errorThresholdPercentage: options?.errorThresholdPercentage ?? 50,
      resetTimeout: options?.resetTimeout ?? 30000,
      volumeThreshold: options?.volumeThreshold ?? 5,
      name,
    });

    breaker.on('open', () => this.logger.warn(`Circuit breaker OPEN: ${name}`));
    breaker.on('halfOpen', () => this.logger.log(`Circuit breaker HALF-OPEN: ${name}`));
    breaker.on('close', () => this.logger.log(`Circuit breaker CLOSED: ${name}`));
    breaker.on('fallback', () => this.logger.warn(`Circuit breaker FALLBACK: ${name}`));

    this.breakers.set(name, breaker);
    return breaker;
  }

  getStats() {
    const stats: Record<string, any> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.stats;
    });
    return stats;
  }
}
