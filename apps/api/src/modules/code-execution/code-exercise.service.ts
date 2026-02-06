import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CODE_EXECUTION_PROVIDER,
  CodeExecutionProvider,
  TestCase,
} from '../../common/external-services';
import { CodeExecutionService } from './code-execution.service';
import {
  CodeExercise,
  CodeSubmission,
  CodeTestCase,
  CodeTestResult,
  CodeSubmissionStatus,
  Prisma,
} from '@prisma/client';

type CodeExerciseWithTestCases = CodeExercise & {
  testCases: CodeTestCase[];
};

type CodeSubmissionWithResults = CodeSubmission & {
  testResults: CodeTestResult[];
};

/**
 * Code Exercise Service
 *
 * Manages code exercises and submissions for programming courses.
 * Integrates with the code execution provider for running tests.
 */
@Injectable()
export class CodeExerciseService {
  private readonly logger = new Logger(CodeExerciseService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CODE_EXECUTION_PROVIDER)
    private readonly codeExecutionProvider: CodeExecutionProvider,
    private readonly codeExecutionService: CodeExecutionService,
  ) {}

  // ============ EXERCISE MANAGEMENT ============

  /**
   * Create a new code exercise
   */
  async createExercise(
    lessonId: string,
    data: {
      title: string;
      description: string;
      instructions: string;
      languageId: string;
      starterCode?: string;
      solutionCode?: string;
      hints?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
      points?: number;
      timeLimit?: number;
      memoryLimit?: number;
      isRequired?: boolean;
      testCases?: {
        name?: string;
        input: string;
        expected: string;
        points?: number;
        isHidden?: boolean;
      }[];
    },
  ): Promise<CodeExerciseWithTestCases> {
    // Verify language is supported
    const isSupported = await this.codeExecutionProvider.isLanguageSupported(data.languageId);
    if (!isSupported) {
      throw new BadRequestException(`Language '${data.languageId}' is not supported`);
    }

    // Get max sort order for this lesson
    const maxOrder = await this.prisma.codeExercise.aggregate({
      where: { lessonId },
      _max: { sortOrder: true },
    });

    return this.prisma.codeExercise.create({
      data: {
        lessonId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        languageId: data.languageId,
        starterCode: data.starterCode,
        solutionCode: data.solutionCode,
        hints: data.hints as any,
        difficulty: data.difficulty || 'medium',
        points: data.points || 10,
        timeLimit: data.timeLimit || 5,
        memoryLimit: data.memoryLimit || 256000,
        isRequired: data.isRequired || false,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        testCases: {
          create: (data.testCases || []).map((tc, index) => ({
            name: tc.name,
            input: tc.input,
            expected: tc.expected,
            points: tc.points || 1,
            isHidden: tc.isHidden || false,
            sortOrder: index,
          })),
        },
      },
      include: {
        testCases: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Get an exercise by ID
   */
  async getExercise(
    exerciseId: string,
    includeHidden = false,
  ): Promise<CodeExerciseWithTestCases | null> {
    const exercise = await this.prisma.codeExercise.findUnique({
      where: { id: exerciseId },
      include: {
        testCases: {
          where: includeHidden ? {} : { isHidden: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!exercise) return null;

    // Hide solution code for non-instructors (handled at controller level)
    return exercise;
  }

  /**
   * Get exercises for a lesson
   */
  async getExercisesForLesson(
    lessonId: string,
    includeHidden = false,
  ): Promise<CodeExerciseWithTestCases[]> {
    return this.prisma.codeExercise.findMany({
      where: { lessonId },
      include: {
        testCases: {
          where: includeHidden ? {} : { isHidden: false },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Update an exercise
   */
  async updateExercise(
    exerciseId: string,
    data: Partial<{
      title: string;
      description: string;
      instructions: string;
      languageId: string;
      starterCode: string;
      solutionCode: string;
      hints: string[];
      difficulty: 'easy' | 'medium' | 'hard';
      points: number;
      timeLimit: number;
      memoryLimit: number;
      isRequired: boolean;
    }>,
  ): Promise<CodeExercise> {
    // Verify language if being updated
    if (data.languageId) {
      const isSupported = await this.codeExecutionProvider.isLanguageSupported(data.languageId);
      if (!isSupported) {
        throw new BadRequestException(`Language '${data.languageId}' is not supported`);
      }
    }

    return this.prisma.codeExercise.update({
      where: { id: exerciseId },
      data: {
        ...data,
        hints: data.hints as any,
      },
    });
  }

  /**
   * Delete an exercise
   */
  async deleteExercise(exerciseId: string): Promise<void> {
    await this.prisma.codeExercise.delete({
      where: { id: exerciseId },
    });
  }

  // ============ TEST CASE MANAGEMENT ============

  /**
   * Add a test case to an exercise
   */
  async addTestCase(
    exerciseId: string,
    data: {
      name?: string;
      input: string;
      expected: string;
      points?: number;
      isHidden?: boolean;
    },
  ): Promise<CodeTestCase> {
    const maxOrder = await this.prisma.codeTestCase.aggregate({
      where: { exerciseId },
      _max: { sortOrder: true },
    });

    return this.prisma.codeTestCase.create({
      data: {
        exerciseId,
        name: data.name,
        input: data.input,
        expected: data.expected,
        points: data.points || 1,
        isHidden: data.isHidden || false,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });
  }

  /**
   * Update a test case
   */
  async updateTestCase(
    testCaseId: string,
    data: Partial<{
      name: string;
      input: string;
      expected: string;
      points: number;
      isHidden: boolean;
    }>,
  ): Promise<CodeTestCase> {
    return this.prisma.codeTestCase.update({
      where: { id: testCaseId },
      data,
    });
  }

  /**
   * Delete a test case
   */
  async deleteTestCase(testCaseId: string): Promise<void> {
    await this.prisma.codeTestCase.delete({
      where: { id: testCaseId },
    });
  }

  // ============ SUBMISSIONS ============

  /**
   * Submit code for an exercise
   */
  async submitCode(
    userId: string,
    exerciseId: string,
    code: string,
  ): Promise<CodeSubmissionWithResults> {
    const exercise = await this.prisma.codeExercise.findUnique({
      where: { id: exerciseId },
      include: {
        testCases: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    // Enforce rate limit before consuming provider resources
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    const tier = user?.subscriptionTier || 'FREE';
    const rateLimitResult = await this.codeExecutionService.checkRateLimit(userId, tier);
    if (!rateLimitResult.allowed) {
      throw new ForbiddenException(rateLimitResult.reason || 'Rate limit exceeded. Try again later.');
    }

    // Create submission record
    const submission = await this.prisma.codeSubmission.create({
      data: {
        exerciseId,
        userId,
        code,
        languageId: exercise.languageId,
        status: 'QUEUED',
        provider: this.codeExecutionProvider.providerName,
        testsTotal: exercise.testCases.length,
        pointsTotal: exercise.testCases.reduce((sum, tc) => sum + tc.points, 0),
      },
    });

    // Execute against all test cases
    try {
      const testCases: TestCase[] = exercise.testCases.map((tc) => ({
        id: tc.id,
        name: tc.name || undefined,
        input: tc.input,
        expectedOutput: tc.expected,
        points: tc.points,
        isHidden: tc.isHidden,
        timeLimit: exercise.timeLimit,
        memoryLimit: exercise.memoryLimit,
      }));

      // Update status to processing
      await this.prisma.codeSubmission.update({
        where: { id: submission.id },
        data: { status: 'PROCESSING' },
      });

      const batchResult = await this.codeExecutionProvider.executeWithTests(
        {
          sourceCode: code,
          languageId: exercise.languageId,
          cpuTimeLimit: exercise.timeLimit,
          memoryLimit: exercise.memoryLimit,
        },
        testCases,
      );

      // Store test results
      const testResults = await Promise.all(
        batchResult.testResults.map((tr) =>
          this.prisma.codeTestResult.create({
            data: {
              submissionId: submission.id,
              testCaseId: tr.testCaseId,
              passed: tr.passed,
              status: this.mapStatusToPrisma(tr.status),
              actualOutput: tr.actualOutput,
              executionTime: tr.executionTime,
              memoryUsed: tr.memoryUsed,
              errorMessage: tr.error,
            },
          }),
        ),
      );

      // Determine overall status
      const allPassed = batchResult.testsPassed === batchResult.totalTests;
      const hasCompilationError = batchResult.testResults.some(
        (r) => r.status === 'compilation_error',
      );
      const hasRuntimeError = batchResult.testResults.some(
        (r) => r.status === 'runtime_error',
      );
      const hasTimeLimit = batchResult.testResults.some(
        (r) => r.status === 'time_limit_exceeded',
      );
      const hasMemoryLimit = batchResult.testResults.some(
        (r) => r.status === 'memory_limit_exceeded',
      );

      let overallStatus: CodeSubmissionStatus = 'ACCEPTED';
      if (!allPassed) {
        if (hasCompilationError) overallStatus = 'COMPILATION_ERROR';
        else if (hasRuntimeError) overallStatus = 'RUNTIME_ERROR';
        else if (hasTimeLimit) overallStatus = 'TIME_LIMIT_EXCEEDED';
        else if (hasMemoryLimit) overallStatus = 'MEMORY_LIMIT_EXCEEDED';
        else overallStatus = 'WRONG_ANSWER';
      }

      // Update submission with results
      const updatedSubmission = await this.prisma.codeSubmission.update({
        where: { id: submission.id },
        data: {
          status: overallStatus,
          testsPassed: batchResult.testsPassed,
          pointsEarned: batchResult.totalPoints || 0,
          executionTime: batchResult.averageExecutionTime,
          memoryUsed: batchResult.maxMemoryUsed,
          completedAt: new Date(),
        },
        include: {
          testResults: true,
        },
      });

      await this.codeExecutionService.trackExecution(userId);

      return updatedSubmission;
    } catch (error: any) {
      // Update submission with error
      await this.prisma.codeSubmission.update({
        where: { id: submission.id },
        data: {
          status: 'INTERNAL_ERROR',
          stderr: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Get a submission by ID
   */
  async getSubmission(
    submissionId: string,
    userId?: string,
    isInstructor = false,
  ): Promise<CodeSubmissionWithResults | null> {
    const submission = await this.prisma.codeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        testResults: {
          include: {
            testCase: true,
          },
        },
        exercise: true,
      },
    });

    if (!submission) return null;

    // Check access
    if (!isInstructor && userId && submission.userId !== userId) {
      throw new ForbiddenException('You do not have access to this submission');
    }

    // Hide actual output for hidden test cases (for students)
    if (!isInstructor && submission.testResults) {
      submission.testResults = submission.testResults.map((tr: any) => {
        if (tr.testCase?.isHidden) {
          return {
            ...tr,
            actualOutput: null,
            testCase: {
              ...tr.testCase,
              input: null,
              expected: null,
            },
          };
        }
        return tr;
      });
    }

    return submission;
  }

  /**
   * Get submissions for a user on an exercise
   */
  async getUserSubmissions(
    userId: string,
    exerciseId: string,
    limit = 10,
  ): Promise<CodeSubmission[]> {
    return this.prisma.codeSubmission.findMany({
      where: {
        userId,
        exerciseId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all submissions for an exercise (instructor view)
   */
  async getExerciseSubmissions(
    exerciseId: string,
    options?: {
      status?: CodeSubmissionStatus;
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    submissions: CodeSubmission[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const limit = options?.limit || 50;

    const submissions = await this.prisma.codeSubmission.findMany({
      where: {
        exerciseId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        testResults: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(options?.cursor && {
        cursor: { id: options.cursor },
        skip: 1,
      }),
    });

    const hasMore = submissions.length > limit;
    if (hasMore) submissions.pop();

    return {
      submissions,
      nextCursor: hasMore ? submissions[submissions.length - 1]?.id : undefined,
      hasMore,
    };
  }

  /**
   * Get user's best submission for an exercise
   */
  async getBestSubmission(
    userId: string,
    exerciseId: string,
  ): Promise<CodeSubmission | null> {
    return this.prisma.codeSubmission.findFirst({
      where: {
        userId,
        exerciseId,
        status: 'ACCEPTED',
      },
      orderBy: [
        { pointsEarned: 'desc' },
        { executionTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get user's progress on all exercises in a lesson
   */
  async getLessonProgress(
    userId: string,
    lessonId: string,
  ): Promise<{
    exerciseId: string;
    title: string;
    completed: boolean;
    bestScore: number;
    maxScore: number;
    attempts: number;
  }[]> {
    const exercises = await this.prisma.codeExercise.findMany({
      where: { lessonId },
      include: {
        submissions: {
          where: { userId },
          select: {
            pointsEarned: true,
            status: true,
          },
        },
        testCases: {
          select: { points: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return exercises.map((exercise) => {
      const maxScore = exercise.testCases.reduce((sum, tc) => sum + tc.points, 0);
      const bestSubmission = exercise.submissions.reduce(
        (best, sub) => (sub.pointsEarned > best.pointsEarned ? sub : best),
        { pointsEarned: 0, status: 'QUEUED' as CodeSubmissionStatus },
      );

      return {
        exerciseId: exercise.id,
        title: exercise.title,
        completed: bestSubmission.status === 'ACCEPTED',
        bestScore: bestSubmission.pointsEarned,
        maxScore,
        attempts: exercise.submissions.length,
      };
    });
  }

  // ============ HELPERS ============

  private mapStatusToPrisma(status: string): CodeSubmissionStatus {
    const statusMap: Record<string, CodeSubmissionStatus> = {
      queued: 'QUEUED',
      processing: 'PROCESSING',
      accepted: 'ACCEPTED',
      wrong_answer: 'WRONG_ANSWER',
      time_limit_exceeded: 'TIME_LIMIT_EXCEEDED',
      memory_limit_exceeded: 'MEMORY_LIMIT_EXCEEDED',
      compilation_error: 'COMPILATION_ERROR',
      runtime_error: 'RUNTIME_ERROR',
      internal_error: 'INTERNAL_ERROR',
    };

    return statusMap[status] || 'INTERNAL_ERROR';
  }
}
