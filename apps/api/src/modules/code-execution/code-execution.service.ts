import { Injectable, Inject, Logger, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CODE_EXECUTION_PROVIDER,
  CodeExecutionProvider,
  CodeExecutionRequest,
  CodeExecutionResult,
  ProgrammingLanguage,
  ExecutionLimits,
} from '../../common/external-services';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';

/**
 * Code Execution Service
 *
 * Handles code execution using the provider-agnostic interface.
 * Enforces rate limits based on subscription tier.
 */
@Injectable()
export class CodeExecutionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CodeExecutionService.name);

  /** Sliding-window execution history: userId → timestamps in ms */
  private readonly executionHistory = new Map<string, number[]>();
  private cleanupInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CODE_EXECUTION_PROVIDER)
    private readonly codeExecutionProvider: CodeExecutionProvider,
  ) {
    this.logger.log(`Code execution service initialized with provider: ${this.codeExecutionProvider.providerName}`);
  }

  onModuleInit() {
    // Remove entries older than 24 h every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupOldEntries(), 300_000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }

  private cleanupOldEntries() {
    const dayAgo = Date.now() - 86_400_000;
    for (const [userId, timestamps] of this.executionHistory) {
      const recent = timestamps.filter((t) => t > dayAgo);
      if (recent.length === 0) {
        this.executionHistory.delete(userId);
      } else {
        this.executionHistory.set(userId, recent);
      }
    }
  }

  // ============ LANGUAGE SUPPORT ============

  /**
   * Get all supported programming languages
   */
  async getSupportedLanguages(): Promise<ProgrammingLanguage[]> {
    return this.codeExecutionProvider.getSupportedLanguages();
  }

  /**
   * Get a specific language by ID
   */
  async getLanguage(languageId: string): Promise<ProgrammingLanguage | null> {
    return this.codeExecutionProvider.getLanguage(languageId);
  }

  /**
   * Check if a language is supported
   */
  async isLanguageSupported(languageId: string): Promise<boolean> {
    return this.codeExecutionProvider.isLanguageSupported(languageId);
  }

  // ============ CODE EXECUTION ============

  /**
   * Execute code with rate limiting
   */
  async execute(
    userId: string,
    request: {
      sourceCode: string;
      languageId: string;
      stdin?: string;
      args?: string[];
    },
  ): Promise<CodeExecutionResult> {
    // Get user's subscription tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier || 'FREE';

    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(userId, tier);
    if (!rateLimitResult.allowed) {
      throw new ForbiddenException(
        `Rate limit exceeded. ${rateLimitResult.reason || 'Try again later.'}`,
      );
    }

    // Get limits for tier
    const limits = this.getLimitsForTier(tier);

    // Validate code size
    if (request.sourceCode.length > limits.maxCodeSize) {
      return {
        id: '',
        status: 'internal_error',
        message: `Code size exceeds limit of ${limits.maxCodeSize} characters`,
        createdAt: new Date(),
      };
    }

    // Validate stdin size
    if (request.stdin && request.stdin.length > limits.maxStdinSize) {
      return {
        id: '',
        status: 'internal_error',
        message: `Input size exceeds limit of ${limits.maxStdinSize} characters`,
        createdAt: new Date(),
      };
    }

    // Execute code
    const result = await this.codeExecutionProvider.execute({
      sourceCode: request.sourceCode,
      languageId: request.languageId,
      stdin: request.stdin,
      args: request.args,
      cpuTimeLimit: limits.cpuTimeLimitPerExecution,
      memoryLimit: limits.memoryLimitPerExecution,
    });

    // Track execution for rate limiting
    await this.trackExecution(userId);

    return result;
  }

  /**
   * Execute code asynchronously
   */
  async executeAsync(
    userId: string,
    request: {
      sourceCode: string;
      languageId: string;
      stdin?: string;
    },
  ): Promise<{ submissionId: string; status: 'queued' | 'processing' }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier || 'FREE';
    const rateLimitResult = await this.checkRateLimit(userId, tier);

    if (!rateLimitResult.allowed) {
      throw new ForbiddenException(rateLimitResult.reason);
    }

    const result = await this.codeExecutionProvider.executeAsync({
      sourceCode: request.sourceCode,
      languageId: request.languageId,
      stdin: request.stdin,
    });

    await this.trackExecution(userId);

    return result;
  }

  /**
   * Get result of async execution
   */
  async getExecutionResult(submissionId: string): Promise<CodeExecutionResult | null> {
    return this.codeExecutionProvider.getExecutionResult(submissionId);
  }

  // ============ RATE LIMITING ============

  /**
   * Check rate limit for a user using a sliding window over in-memory history.
   * NOTE: Single-instance only — switch to Redis for multi-instance deployments.
   */
  async checkRateLimit(
    userId: string,
    tier: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt?: Date;
    reason?: string;
  }> {
    const limits = this.getLimitsForTier(tier);

    // ENTERPRISE tier is unlimited
    if (limits.executionsPerDay === -1) {
      return { allowed: true, remaining: -1 };
    }

    const now = Date.now();
    const hourAgo = now - 3_600_000;
    const dayAgo = now - 86_400_000;

    const history = this.executionHistory.get(userId) || [];
    const hourlyEntries = history.filter((t) => t > hourAgo);
    const dailyEntries = history.filter((t) => t > dayAgo);

    if (dailyEntries.length >= limits.executionsPerDay) {
      const oldestDaily = Math.min(...dailyEntries);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestDaily + 86_400_000),
        reason: `Daily limit of ${limits.executionsPerDay} executions reached.`,
      };
    }

    if (hourlyEntries.length >= limits.executionsPerHour) {
      const oldestHourly = Math.min(...hourlyEntries);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldestHourly + 3_600_000),
        reason: `Hourly limit of ${limits.executionsPerHour} executions reached.`,
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        limits.executionsPerHour - hourlyEntries.length,
        limits.executionsPerDay - dailyEntries.length,
      ),
    };
  }

  /**
   * Get limits for a subscription tier
   */
  getLimitsForTier(tier: string): ExecutionLimits {
    return this.codeExecutionProvider.getLimitsForTier(tier);
  }

  /**
   * Record an execution timestamp for rate-limit tracking.
   */
  async trackExecution(userId: string): Promise<void> {
    const history = this.executionHistory.get(userId) || [];
    history.push(Date.now());
    this.executionHistory.set(userId, history);
  }

  // ============ HEALTH ============

  /**
   * Get provider health status
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    message?: string;
  }> {
    return this.codeExecutionProvider.healthCheck();
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    workersAvailable: number;
  }> {
    return this.codeExecutionProvider.getQueueStatus();
  }

  // ============ PROVIDER INFO ============

  /**
   * Get current provider information
   */
  getProviderInfo(): {
    name: string;
  } {
    return {
      name: this.codeExecutionProvider.providerName,
    };
  }
}
