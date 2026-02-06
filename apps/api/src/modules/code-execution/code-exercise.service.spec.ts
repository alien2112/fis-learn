import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CodeExerciseService } from './code-exercise.service';
import { CodeExecutionService } from './code-execution.service';
import { CODE_EXECUTION_PROVIDER } from '../../common/external-services';
import { PrismaService } from '../../prisma/prisma.service';

describe('CodeExerciseService', () => {
  let service: CodeExerciseService;
  let mockProvider: Record<string, any>;
  let mockPrisma: Record<string, any>;
  let mockCodeExecutionService: Record<string, jest.Mock>;

  const mockExercise = {
    id: 'ex-1',
    lessonId: 'lesson-1',
    title: 'Sum Two Numbers',
    description: 'Add two numbers',
    instructions: 'Write a function that sums two integers.',
    languageId: 'python',
    starterCode: 'def add(a, b):\n    pass',
    solutionCode: 'def add(a, b):\n    return a + b',
    hints: ['Use the + operator'],
    difficulty: 'easy',
    points: 10,
    timeLimit: 5,
    memoryLimit: 256000,
    sortOrder: 1,
    isRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    testCases: [
      { id: 'tc-1', exerciseId: 'ex-1', input: '2 3', expected: '5', points: 5, isHidden: false, sortOrder: 0, name: 'Basic addition' },
      { id: 'tc-2', exerciseId: 'ex-1', input: '-1 1', expected: '0', points: 5, isHidden: true, sortOrder: 1, name: 'Negative numbers' },
    ],
  };

  const mockBatchResult = {
    submissionId: 'batch-1',
    status: 'completed',
    testResults: [
      { testCaseId: 'tc-1', passed: true, status: 'accepted', actualOutput: '5', executionTime: 0.3, memoryUsed: 512, pointsEarned: 5, pointsPossible: 5 },
      { testCaseId: 'tc-2', passed: true, status: 'accepted', actualOutput: '0', executionTime: 0.2, memoryUsed: 400, pointsEarned: 5, pointsPossible: 5 },
    ],
    totalTests: 2,
    testsPassed: 2,
    totalPoints: 10,
    maxPoints: 10,
    averageExecutionTime: 0.25,
    maxMemoryUsed: 512,
  };

  beforeEach(async () => {
    mockProvider = {
      providerName: 'test',
      isLanguageSupported: jest.fn().mockResolvedValue(true),
      executeWithTests: jest.fn().mockResolvedValue(mockBatchResult),
    };

    mockPrisma = {
      codeExercise: {
        findUnique: jest.fn().mockResolvedValue(mockExercise),
        findMany: jest.fn().mockResolvedValue([mockExercise]),
        create: jest.fn().mockImplementation((args: any) => ({
          ...mockExercise,
          ...args.data,
          id: 'new-ex-1',
          testCases: args.data.testCases?.create || [],
        })),
        update: jest.fn().mockImplementation((args: any) => ({
          ...mockExercise,
          ...args.data,
        })),
        delete: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 1 } }),
      },
      codeTestCase: {
        create: jest.fn().mockResolvedValue({ ...mockExercise.testCases[0], id: 'new-tc-1' }),
        update: jest.fn().mockResolvedValue(mockExercise.testCases[0]),
        delete: jest.fn().mockResolvedValue(null),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 1 } }),
      },
      codeSubmission: {
        create: jest.fn().mockResolvedValue({
          id: 'sub-1',
          exerciseId: 'ex-1',
          userId: 'user-1',
          code: 'def add(a, b):\n    return a + b',
          languageId: 'python',
          status: 'QUEUED',
          provider: 'test',
          testsTotal: 2,
          pointsTotal: 10,
        }),
        update: jest.fn().mockImplementation((args: any) => ({
          id: 'sub-1',
          exerciseId: 'ex-1',
          userId: 'user-1',
          ...args.data,
          testResults: args.include?.testResults
            ? [
                { id: 'res-1', testCaseId: 'tc-1', passed: true, status: 'ACCEPTED' },
                { id: 'res-2', testCaseId: 'tc-2', passed: true, status: 'ACCEPTED' },
              ]
            : undefined,
        })),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      codeTestResult: {
        create: jest.fn().mockImplementation((args: any) => ({
          id: `result-${args.data.testCaseId}`,
          ...args.data,
        })),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ subscriptionTier: 'FREE' }),
      },
    };

    mockCodeExecutionService = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
      trackExecution: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeExerciseService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CODE_EXECUTION_PROVIDER, useValue: mockProvider },
        { provide: CodeExecutionService, useValue: mockCodeExecutionService },
      ],
    }).compile();

    service = module.get<CodeExerciseService>(CodeExerciseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============ EXERCISE CRUD ============

  describe('createExercise', () => {
    it('should create an exercise and verify language support', async () => {
      await service.createExercise('lesson-1', {
        title: 'Sum Two Numbers',
        description: 'Add two numbers',
        instructions: 'Write a function...',
        languageId: 'python',
        testCases: [{ input: '2 3', expected: '5', points: 5 }],
      });

      expect(mockProvider.isLanguageSupported).toHaveBeenCalledWith('python');
      expect(mockPrisma.codeExercise.create).toHaveBeenCalledTimes(1);
    });

    it('should reject an unsupported language', async () => {
      mockProvider.isLanguageSupported.mockResolvedValue(false);

      await expect(
        service.createExercise('lesson-1', {
          title: 'Test',
          description: 'Test',
          instructions: 'Test',
          languageId: 'brainfuck',
        }),
      ).rejects.toThrow("Language 'brainfuck' is not supported");
    });

    it('should set sortOrder to max + 1', async () => {
      mockPrisma.codeExercise.aggregate.mockResolvedValue({ _max: { sortOrder: 7 } });

      await service.createExercise('lesson-1', {
        title: 'Test',
        description: 'Test',
        instructions: 'Test',
        languageId: 'python',
      });

      expect(mockPrisma.codeExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 8 }),
        }),
      );
    });

    it('should default sortOrder to 1 when no exercises exist', async () => {
      mockPrisma.codeExercise.aggregate.mockResolvedValue({ _max: { sortOrder: null } });

      await service.createExercise('lesson-1', {
        title: 'Test',
        description: 'Test',
        instructions: 'Test',
        languageId: 'python',
      });

      expect(mockPrisma.codeExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sortOrder: 1 }),
        }),
      );
    });
  });

  describe('getExercise', () => {
    it('should filter hidden test cases for students', async () => {
      await service.getExercise('ex-1', false);

      expect(mockPrisma.codeExercise.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            testCases: expect.objectContaining({
              where: { isHidden: false },
            }),
          }),
        }),
      );
    });

    it('should include all test cases for instructors', async () => {
      await service.getExercise('ex-1', true);

      expect(mockPrisma.codeExercise.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            testCases: expect.objectContaining({
              where: {},
            }),
          }),
        }),
      );
    });

    it('should return null for a non-existent exercise', async () => {
      mockPrisma.codeExercise.findUnique.mockResolvedValue(null);

      const result = await service.getExercise('missing-id');

      expect(result).toBeNull();
    });
  });

  describe('updateExercise', () => {
    it('should validate language support when languageId is updated', async () => {
      await service.updateExercise('ex-1', { languageId: 'javascript' });

      expect(mockProvider.isLanguageSupported).toHaveBeenCalledWith('javascript');
    });

    it('should reject an unsupported language on update', async () => {
      mockProvider.isLanguageSupported.mockResolvedValue(false);

      await expect(
        service.updateExercise('ex-1', { languageId: 'haskell' }),
      ).rejects.toThrow("Language 'haskell' is not supported");
    });

    it('should skip language validation when languageId is not being changed', async () => {
      await service.updateExercise('ex-1', { title: 'New Title' });

      expect(mockProvider.isLanguageSupported).not.toHaveBeenCalled();
    });
  });

  // ============ TEST CASE MANAGEMENT ============

  describe('addTestCase', () => {
    it('should create a test case with sortOrder based on existing cases', async () => {
      mockPrisma.codeTestCase.aggregate.mockResolvedValue({ _max: { sortOrder: 3 } });

      await service.addTestCase('ex-1', {
        input: '10 20',
        expected: '30',
        points: 2,
      });

      expect(mockPrisma.codeTestCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 4,
            points: 2,
            isHidden: false,
          }),
        }),
      );
    });
  });

  // ============ SUBMISSIONS ============

  describe('submitCode', () => {
    it('should check rate limit before executing', async () => {
      await service.submitCode('user-1', 'ex-1', 'def add(a, b):\n    return a + b');

      expect(mockCodeExecutionService.checkRateLimit).toHaveBeenCalledWith('user-1', 'FREE');
      expect(mockProvider.executeWithTests).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException for a missing exercise', async () => {
      mockPrisma.codeExercise.findUnique.mockResolvedValue(null);

      await expect(
        service.submitCode('user-1', 'missing-ex', 'code'),
      ).rejects.toThrow(NotFoundException);

      // Rate limit and execution should never be reached
      expect(mockCodeExecutionService.checkRateLimit).not.toHaveBeenCalled();
      expect(mockProvider.executeWithTests).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when rate-limited', async () => {
      mockCodeExecutionService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        reason: 'Hourly limit of 10 executions reached.',
      });

      await expect(
        service.submitCode('user-1', 'ex-1', 'code'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockProvider.executeWithTests).not.toHaveBeenCalled();
      expect(mockCodeExecutionService.trackExecution).not.toHaveBeenCalled();
    });

    it('should track execution after a successful submission', async () => {
      await service.submitCode('user-1', 'ex-1', 'def add(a, b):\n    return a + b');

      expect(mockCodeExecutionService.trackExecution).toHaveBeenCalledWith('user-1');
    });

    it('should create a CodeTestResult for each test case', async () => {
      await service.submitCode('user-1', 'ex-1', 'def add(a, b):\n    return a + b');

      expect(mockPrisma.codeTestResult.create).toHaveBeenCalledTimes(2);
    });

    it('should transition submission status QUEUED → PROCESSING → final', async () => {
      await service.submitCode('user-1', 'ex-1', 'def add(a, b):\n    return a + b');

      const updateCalls = mockPrisma.codeSubmission.update.mock.calls;
      expect(updateCalls[0][0].data.status).toBe('PROCESSING');
      expect(updateCalls[1][0].data.status).toBe('ACCEPTED'); // all tests passed
    });

    it('should set WRONG_ANSWER when not all tests pass', async () => {
      mockProvider.executeWithTests.mockResolvedValue({
        ...mockBatchResult,
        testsPassed: 1,
        testResults: [
          { testCaseId: 'tc-1', passed: true, status: 'accepted', actualOutput: '5', executionTime: 0.3, memoryUsed: 512 },
          { testCaseId: 'tc-2', passed: false, status: 'accepted', actualOutput: '99', executionTime: 0.2, memoryUsed: 400 },
        ],
        totalPoints: 5,
      });

      await service.submitCode('user-1', 'ex-1', 'bad code');

      const finalUpdate = mockPrisma.codeSubmission.update.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('WRONG_ANSWER');
    });

    it('should set COMPILATION_ERROR when any test has compilation_error', async () => {
      mockProvider.executeWithTests.mockResolvedValue({
        ...mockBatchResult,
        testsPassed: 0,
        testResults: [
          { testCaseId: 'tc-1', passed: false, status: 'compilation_error', actualOutput: '', executionTime: 0.1, memoryUsed: 100, error: 'SyntaxError' },
          { testCaseId: 'tc-2', passed: false, status: 'compilation_error', actualOutput: '', executionTime: 0.1, memoryUsed: 100, error: 'SyntaxError' },
        ],
        totalPoints: 0,
      });

      await service.submitCode('user-1', 'ex-1', 'syntax error code');

      const finalUpdate = mockPrisma.codeSubmission.update.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('COMPILATION_ERROR');
    });

    it('should set INTERNAL_ERROR and rethrow on provider failure', async () => {
      mockProvider.executeWithTests.mockRejectedValue(new Error('Judge0 unavailable'));

      await expect(
        service.submitCode('user-1', 'ex-1', 'code'),
      ).rejects.toThrow('Judge0 unavailable');

      const errorUpdate = mockPrisma.codeSubmission.update.mock.calls.find(
        (call: any) => call[0].data.status === 'INTERNAL_ERROR',
      );
      expect(errorUpdate).toBeDefined();
      expect(errorUpdate[0].data.stderr).toBe('Judge0 unavailable');
      // execution should NOT be tracked on failure
      expect(mockCodeExecutionService.trackExecution).not.toHaveBeenCalled();
    });
  });

  // ============ SUBMISSIONS QUERY ============

  describe('getUserSubmissions', () => {
    it('should return submissions for a user on a specific exercise', async () => {
      const mockSubs = [{ id: 'sub-1', status: 'ACCEPTED' }];
      mockPrisma.codeSubmission.findMany.mockResolvedValue(mockSubs);

      const result = await service.getUserSubmissions('user-1', 'ex-1', 5);

      expect(result).toEqual(mockSubs);
      expect(mockPrisma.codeSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', exerciseId: 'ex-1' },
          take: 5,
        }),
      );
    });
  });

  describe('getBestSubmission', () => {
    it('should query for the best ACCEPTED submission ordered by points then time', async () => {
      const best = { id: 'sub-best', pointsEarned: 10, executionTime: 0.2 };
      mockPrisma.codeSubmission.findFirst.mockResolvedValue(best);

      const result = await service.getBestSubmission('user-1', 'ex-1');

      expect(result).toEqual(best);
      expect(mockPrisma.codeSubmission.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', exerciseId: 'ex-1', status: 'ACCEPTED' },
          orderBy: [
            { pointsEarned: 'desc' },
            { executionTime: 'asc' },
            { createdAt: 'asc' },
          ],
        }),
      );
    });

    it('should return null when no accepted submission exists', async () => {
      mockPrisma.codeSubmission.findFirst.mockResolvedValue(null);

      const result = await service.getBestSubmission('user-1', 'ex-1');

      expect(result).toBeNull();
    });
  });

  // ============ PROGRESS ============

  describe('getLessonProgress', () => {
    it('should calculate progress across multiple exercises', async () => {
      mockPrisma.codeExercise.findMany.mockResolvedValue([
        {
          id: 'ex-1',
          title: 'Exercise 1',
          submissions: [
            { pointsEarned: 10, status: 'ACCEPTED' },
            { pointsEarned: 5, status: 'WRONG_ANSWER' },
          ],
          testCases: [{ points: 5 }, { points: 5 }],
        },
        {
          id: 'ex-2',
          title: 'Exercise 2',
          submissions: [], // not attempted
          testCases: [{ points: 10 }],
        },
        {
          id: 'ex-3',
          title: 'Exercise 3',
          submissions: [{ pointsEarned: 3, status: 'WRONG_ANSWER' }],
          testCases: [{ points: 5 }, { points: 5 }],
        },
      ]);

      const progress = await service.getLessonProgress('user-1', 'lesson-1');

      expect(progress).toHaveLength(3);

      expect(progress[0]).toMatchObject({
        exerciseId: 'ex-1',
        title: 'Exercise 1',
        completed: true,
        bestScore: 10,
        maxScore: 10,
        attempts: 2,
      });

      expect(progress[1]).toMatchObject({
        exerciseId: 'ex-2',
        completed: false,
        bestScore: 0,
        maxScore: 10,
        attempts: 0,
      });

      expect(progress[2]).toMatchObject({
        exerciseId: 'ex-3',
        completed: false,
        bestScore: 3,
        maxScore: 10,
        attempts: 1,
      });
    });
  });
});
