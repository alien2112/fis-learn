import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import {
  CODE_EXECUTION_PROVIDER,
  CodeExecutionResult,
  DEFAULT_TIER_LIMITS,
  ExecutionLimits,
} from '../../common/external-services';
import { PrismaService } from '../../prisma/prisma.service';

/** Finite limits for FREE in tests (DEFAULT_TIER_LIMITS uses -1 = unlimited). */
const FREE_TEST_LIMITS: ExecutionLimits = {
  ...DEFAULT_TIER_LIMITS.FREE,
  executionsPerHour: 10,
  executionsPerDay: 500,
};

describe('CodeExecutionService', () => {
  let service: CodeExecutionService;
  let mockProvider: Record<string, any>;
  let mockPrisma: { user: { findUnique: jest.Mock } };

  const mockExecutionResult: CodeExecutionResult = {
    id: 'exec-123',
    status: 'accepted',
    stdout: 'Hello, World!\n',
    executionTime: 0.5,
    memoryUsed: 1024,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockProvider = {
      providerName: 'test',
      getSupportedLanguages: jest.fn().mockResolvedValue([]),
      getLanguage: jest.fn().mockResolvedValue(null),
      isLanguageSupported: jest.fn().mockResolvedValue(true),
      execute: jest.fn().mockResolvedValue(mockExecutionResult),
      executeAsync: jest.fn().mockResolvedValue({ submissionId: 'async-123', status: 'queued' }),
      getExecutionResult: jest.fn().mockResolvedValue(mockExecutionResult),
      executeWithTests: jest.fn().mockResolvedValue({ testsPassed: 1, totalTests: 1, testResults: [] }),
      getBatchTestResult: jest.fn().mockResolvedValue(null),
      getQueueStatus: jest.fn().mockResolvedValue({ queueLength: 0, averageWaitTime: 0, workersAvailable: 1 }),
      getLimitsForTier: jest.fn((tier: string) =>
        tier === 'FREE' ? FREE_TEST_LIMITS : (DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.FREE),
      ),
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
      healthCheck: jest.fn().mockResolvedValue({ healthy: true, latency: 50 }),
    };

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ subscriptionTier: 'FREE' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeExecutionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CODE_EXECUTION_PROVIDER, useValue: mockProvider },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<CodeExecutionService>(CodeExecutionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ RATE LIMITING ============

  describe('rate limiting', () => {
    it('should allow execution when history is empty', async () => {
      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10); // FREE hourly limit
    });

    it('should decrement remaining after each tracked execution', async () => {
      await service.trackExecution('user-1');
      await service.trackExecution('user-1');

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(8); // 10 hourly - 2
    });

    it('should block when hourly limit is reached', async () => {
      // FREE hourly limit = 10
      for (let i = 0; i < 10; i++) {
        await service.trackExecution('user-1');
      }

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toContain('Hourly limit');
      expect(result.resetAt).toBeDefined();
    });

    it('should block when daily limit is reached but hourly is not', async () => {
      // FREE_TEST_LIMITS: 500/day — insert 500 timestamps within 24h, spread across hours
      const history: number[] = [];
      const now = Date.now();
      for (let i = 0; i < 500; i++) {
        history.push(now - 5 * 3_600_000 + i * 100);
      }
      (service as any).executionHistory.set('user-1', history);

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily limit');
    });

    it('should never block ENTERPRISE tier regardless of count', async () => {
      for (let i = 0; i < 200; i++) {
        await service.trackExecution('user-1');
      }

      const result = await service.checkRateLimit('user-1', 'ENTERPRISE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it('should track executions independently per user', async () => {
      for (let i = 0; i < 10; i++) {
        await service.trackExecution('user-1');
      }

      // user-2 is unaffected
      const result = await service.checkRateLimit('user-2', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('should use the tighter of hourly and daily remaining', async () => {
      // FREE_TEST_LIMITS: 10/hour, 500/day — add 8 executions so remaining = 2
      for (let i = 0; i < 8; i++) {
        await service.trackExecution('user-1');
      }

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // min(10-8, 500-8) = 2
    });

    it('should return correct resetAt for hourly block', async () => {
      const beforeLoop = Date.now();

      for (let i = 0; i < 10; i++) {
        await service.trackExecution('user-1');
      }

      const result = await service.checkRateLimit('user-1', 'FREE');
      const afterLoop = Date.now();

      expect(result.allowed).toBe(false);
      // resetAt should be ~1 hour from the oldest entry (which was recorded just now)
      expect(result.resetAt!.getTime()).toBeGreaterThanOrEqual(beforeLoop + 3_600_000);
      expect(result.resetAt!.getTime()).toBeLessThanOrEqual(afterLoop + 3_600_000);
    });
  });

  // ============ EXECUTE ============

  describe('execute', () => {
    it('should call the provider and return the result', async () => {
      const result = await service.execute('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
      });

      expect(result.status).toBe('accepted');
      expect(result.stdout).toBe('Hello, World!\n');
      expect(mockProvider.execute).toHaveBeenCalledTimes(1);
    });

    it('should pass tier-based CPU and memory limits to the provider', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ subscriptionTier: 'PRO' });

      await service.execute('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
      });

      expect(mockProvider.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          cpuTimeLimit: DEFAULT_TIER_LIMITS.PRO.cpuTimeLimitPerExecution,
          memoryLimit: DEFAULT_TIER_LIMITS.PRO.memoryLimitPerExecution,
        }),
      );
    });

    it('should reject source code that exceeds the tier code-size limit', async () => {
      // FREE maxCodeSize = 50000
      const oversized = 'x'.repeat(50001);

      const result = await service.execute('user-1', {
        sourceCode: oversized,
        languageId: 'python',
      });

      expect(result.status).toBe('internal_error');
      expect(result.message).toContain('Code size exceeds limit');
      expect(mockProvider.execute).not.toHaveBeenCalled();
    });

    it('should reject stdin that exceeds the tier stdin-size limit', async () => {
      // FREE maxStdinSize = 20000
      const oversizedStdin = 'x'.repeat(20001);

      const result = await service.execute('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
        stdin: oversizedStdin,
      });

      expect(result.status).toBe('internal_error');
      expect(result.message).toContain('Input size exceeds limit');
      expect(mockProvider.execute).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user is rate-limited', async () => {
      for (let i = 0; i < 10; i++) {
        await service.trackExecution('user-1');
      }

      await expect(
        service.execute('user-1', {
          sourceCode: 'print("Hello")',
          languageId: 'python',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockProvider.execute).not.toHaveBeenCalled();
    });

    it('should record an execution after a successful run', async () => {
      await service.execute('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
      });

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.remaining).toBe(9); // 10 - 1
    });
  });

  // ============ EXECUTE ASYNC ============

  describe('executeAsync', () => {
    it('should return a submission ID and queued status', async () => {
      const result = await service.executeAsync('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
      });

      expect(result.submissionId).toBe('async-123');
      expect(result.status).toBe('queued');
    });

    it('should throw ForbiddenException when rate-limited', async () => {
      for (let i = 0; i < 10; i++) {
        await service.trackExecution('user-1');
      }

      await expect(
        service.executeAsync('user-1', {
          sourceCode: 'print("Hello")',
          languageId: 'python',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should record an execution after queueing', async () => {
      await service.executeAsync('user-1', {
        sourceCode: 'print("Hello")',
        languageId: 'python',
      });

      const result = await service.checkRateLimit('user-1', 'FREE');

      expect(result.remaining).toBe(9);
    });
  });

  // ============ HEALTH & INFO ============

  describe('health and info', () => {
    it('should delegate healthCheck to the provider', async () => {
      const health = await service.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.latency).toBe(50);
      expect(mockProvider.healthCheck).toHaveBeenCalledTimes(1);
    });

    it('should delegate getQueueStatus to the provider', async () => {
      const status = await service.getQueueStatus();

      expect(status.queueLength).toBe(0);
      expect(mockProvider.getQueueStatus).toHaveBeenCalledTimes(1);
    });

    it('should return the provider name', () => {
      expect(service.getProviderInfo()).toEqual({ name: 'test' });
    });

    it('should return limits from the provider for a given tier', () => {
      const limits = service.getLimitsForTier('BASIC');

      expect(limits).toEqual(DEFAULT_TIER_LIMITS.BASIC);
      expect(mockProvider.getLimitsForTier).toHaveBeenCalledWith('BASIC');
    });
  });

  // ============ CLEANUP ============

  describe('cleanupOldEntries', () => {
    it('should remove entries older than 24 hours', () => {
      const now = Date.now();
      const oldTimestamp = now - 25 * 3_600_000; // 25 h ago

      (service as any).executionHistory.set('user-old', [oldTimestamp]);
      (service as any).executionHistory.set('user-recent', [now]);

      (service as any).cleanupOldEntries();

      expect((service as any).executionHistory.has('user-old')).toBe(false);
      expect((service as any).executionHistory.has('user-recent')).toBe(true);
    });

    it('should keep only recent timestamps in a mixed history', () => {
      const now = Date.now();
      const mixed = [
        now - 25 * 3_600_000, // stale
        now - 1 * 3_600_000,  // recent
        now,                   // recent
      ];

      (service as any).executionHistory.set('user-mixed', mixed);
      (service as any).cleanupOldEntries();

      expect((service as any).executionHistory.get('user-mixed')).toHaveLength(2);
    });
  });
});
