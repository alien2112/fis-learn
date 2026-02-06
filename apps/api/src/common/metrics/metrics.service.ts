import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private metrics: Map<string, number[]> = new Map();

  recordTiming(metric: string, duration: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(duration);

    // Log slow operations
    if (duration > 1000) {
      this.logger.warn(`Slow operation: ${metric} took ${duration}ms`);
    }
  }

  getPercentile(metric: string, percentile: number): number {
    const values = this.metrics.get(metric) || [];
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Reset metrics periodically (e.g., every minute)
  reset() {
    this.metrics.clear();
  }

  getMetrics(): Record<string, { p50: number; p95: number; p99: number; count: number }> {
    const result: Record<string, { p50: number; p95: number; p99: number; count: number }> = {};

    for (const [key, values] of this.metrics.entries()) {
      result[key] = {
        p50: this.getPercentile(key, 50),
        p95: this.getPercentile(key, 95),
        p99: this.getPercentile(key, 99),
        count: values.length,
      };
    }

    return result;
  }
}
