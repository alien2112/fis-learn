import { Logger } from '@nestjs/common';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, rejecting requests
  HALF_OPEN = 'half_open', // Testing if service recovered
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Failures before opening
  resetTimeout: number; // Time before trying again (ms)
  halfOpenRequests: number; // Successful requests to close
  name?: string; // For logging
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
  halfOpenRequests: 3,
};

/**
 * Circuit Breaker Error
 */
export class CircuitOpenError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly retryAfter: number,
  ) {
    super(`Circuit breaker is open for ${serviceName}. Retry after ${retryAfter}ms`);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Circuit Breaker
 *
 * Protects against cascading failures when external services are down.
 * Use this for any external service call (payment providers, email services, etc.)
 *
 * Usage:
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({ name: 'stripe' });
 *
 * try {
 *   const result = await circuitBreaker.call(() => stripe.customers.create(...));
 * } catch (error) {
 *   if (error instanceof CircuitOpenError) {
 *     // Service is down, use fallback
 *   }
 * }
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly logger: Logger;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger(`CircuitBreaker:${this.config.name || 'default'}`);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async call<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from open to half-open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.logger.log('Circuit transitioning to half-open');
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        const retryAfter = this.config.resetTimeout - (Date.now() - this.lastFailureTime);
        throw new CircuitOpenError(this.config.name || 'service', retryAfter);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute with fallback if circuit is open
   */
  async callWithFallback<T>(fn: () => Promise<T>, fallback: T | (() => T)): Promise<T> {
    try {
      return await this.call(fn);
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        this.logger.warn('Using fallback due to open circuit');
        return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
      }
      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): {
    state: CircuitState;
    failures: number;
    lastFailure: number;
    successCount: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime,
      successCount: this.successCount,
    };
  }

  /**
   * Manually reset the circuit
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.logger.log('Circuit manually reset');
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenRequests) {
        this.logger.log('Circuit closing after successful requests');
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.warn('Failure during half-open state, reopening circuit');
      this.state = CircuitState.OPEN;
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.logger.error(
        `Circuit opening after ${this.failures} failures: ${error.message}`,
      );
      this.state = CircuitState.OPEN;
    }
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ ...config, name }));
    }
    return this.breakers.get(name)!;
  }

  getAll(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  reset(name: string): void {
    this.breakers.get(name)?.reset();
  }

  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
