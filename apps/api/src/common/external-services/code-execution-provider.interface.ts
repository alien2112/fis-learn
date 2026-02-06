/**
 * Code Execution Provider Interface
 *
 * Provider-agnostic interface for code execution in programming courses.
 * Implement this interface for any code execution provider (Judge0, Piston, CodeSandbox, etc.)
 *
 * To add a new provider:
 * 1. Create a new file: judge0.provider.ts, piston.provider.ts, etc.
 * 2. Implement the CodeExecutionProvider interface
 * 3. Register it in the CodeExecutionModule with the CODE_EXECUTION_PROVIDER token
 *
 * Security Considerations:
 * - All code runs in sandboxed containers
 * - Resource limits (CPU, memory, time) enforced
 * - Network access disabled by default
 * - File system isolated
 * - Rate limiting per user/subscription tier
 */

// ============ LANGUAGE SUPPORT ============

export interface ProgrammingLanguage {
  /** Language identifier */
  id: string;
  /** Display name */
  name: string;
  /** Version string */
  version: string;
  /** File extension */
  extension: string;
  /** Monaco editor language ID */
  monacoLanguage: string;
  /** Whether language is compiled */
  isCompiled: boolean;
  /** Default source code template */
  defaultTemplate?: string;
  /** Example "Hello World" code */
  helloWorld?: string;
}

// ============ EXECUTION TYPES ============

export interface CodeExecutionRequest {
  /** Source code to execute */
  sourceCode: string;
  /** Language ID */
  languageId: string;
  /** Standard input (for interactive programs) */
  stdin?: string;
  /** Command line arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Compiler/interpreter flags */
  compilerFlags?: string;
  /** CPU time limit in seconds */
  cpuTimeLimit?: number;
  /** Wall clock time limit in seconds */
  wallTimeLimit?: number;
  /** Memory limit in KB */
  memoryLimit?: number;
  /** Stack size limit in KB */
  stackLimit?: number;
  /** Maximum output size in KB */
  maxOutputSize?: number;
  /** Enable network access (usually disabled) */
  enableNetwork?: boolean;
  /** Additional files to include */
  additionalFiles?: {
    name: string;
    content: string;
  }[];
  /** Callback URL for async execution */
  callbackUrl?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export interface CodeExecutionResult {
  /** Unique execution ID */
  id: string;
  /** Execution status */
  status: CodeExecutionStatus;
  /** Standard output */
  stdout?: string;
  /** Standard error */
  stderr?: string;
  /** Compilation output (for compiled languages) */
  compileOutput?: string;
  /** Exit code */
  exitCode?: number;
  /** Exit signal (if killed) */
  exitSignal?: string;
  /** Execution time in seconds */
  executionTime?: number;
  /** Wall clock time in seconds */
  wallTime?: number;
  /** Memory used in KB */
  memoryUsed?: number;
  /** Status message */
  message?: string;
  /** Detailed status description */
  statusDescription?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Finished timestamp */
  finishedAt?: Date;
  /** Provider-specific data */
  providerData?: Record<string, any>;
}

export type CodeExecutionStatus =
  | 'queued' // Waiting to be processed
  | 'processing' // Currently executing
  | 'accepted' // Executed successfully
  | 'wrong_answer' // Output didn't match expected (for tests)
  | 'time_limit_exceeded'
  | 'memory_limit_exceeded'
  | 'compilation_error'
  | 'runtime_error' // NZEC, SIGSEGV, etc.
  | 'internal_error'; // Provider error

// ============ TEST CASE EXECUTION ============

export interface TestCase {
  /** Test case ID */
  id: string;
  /** Test case name/description */
  name?: string;
  /** Input to provide via stdin */
  input: string;
  /** Expected output */
  expectedOutput: string;
  /** Points for this test case */
  points?: number;
  /** Whether this is a hidden test case */
  isHidden?: boolean;
  /** Time limit override for this test */
  timeLimit?: number;
  /** Memory limit override for this test */
  memoryLimit?: number;
}

export interface TestCaseResult {
  /** Test case ID */
  testCaseId: string;
  /** Test case name */
  testCaseName?: string;
  /** Whether test passed */
  passed: boolean;
  /** Actual output */
  actualOutput?: string;
  /** Expected output (hidden if test is hidden) */
  expectedOutput?: string;
  /** Execution status */
  status: CodeExecutionStatus;
  /** Execution time */
  executionTime?: number;
  /** Memory used */
  memoryUsed?: number;
  /** Points earned */
  pointsEarned?: number;
  /** Points possible */
  pointsPossible?: number;
  /** Error message if failed */
  error?: string;
}

export interface BatchTestResult {
  /** Submission ID */
  submissionId: string;
  /** Overall status */
  status: 'running' | 'completed' | 'failed';
  /** Individual test results */
  testResults: TestCaseResult[];
  /** Total tests */
  totalTests: number;
  /** Tests passed */
  testsPassed: number;
  /** Total points earned */
  totalPoints?: number;
  /** Maximum points possible */
  maxPoints?: number;
  /** Overall execution time */
  totalExecutionTime?: number;
  /** Average execution time */
  averageExecutionTime?: number;
  /** Maximum memory used */
  maxMemoryUsed?: number;
  /** Completed timestamp */
  completedAt?: Date;
}

// ============ SANDBOX CONFIGURATION ============

export interface SandboxConfig {
  /** Base CPU time limit in seconds */
  cpuTimeLimit: number;
  /** Base wall clock time limit in seconds */
  wallTimeLimit: number;
  /** Base memory limit in KB */
  memoryLimit: number;
  /** Stack size limit in KB */
  stackLimit: number;
  /** Maximum output size in KB */
  maxOutputSize: number;
  /** Maximum number of processes */
  maxProcesses: number;
  /** Enable network access */
  enableNetwork: boolean;
  /** Allowed system calls (advanced) */
  allowedSyscalls?: string[];
}

// ============ RESOURCE LIMITS BY TIER ============

export interface ExecutionLimits {
  /** Maximum executions per day */
  executionsPerDay: number;
  /** Maximum executions per hour */
  executionsPerHour: number;
  /** Maximum concurrent executions */
  concurrentExecutions: number;
  /** CPU time limit per execution (seconds) */
  cpuTimeLimitPerExecution: number;
  /** Memory limit per execution (KB) */
  memoryLimitPerExecution: number;
  /** Maximum code size (characters) */
  maxCodeSize: number;
  /** Maximum stdin size (characters) */
  maxStdinSize: number;
}

// ============ MAIN INTERFACE ============

/**
 * Code Execution Provider Interface
 *
 * All code execution providers must implement this interface.
 */
export interface CodeExecutionProvider {
  /**
   * Provider identifier (e.g., 'judge0', 'piston', 'codesandbox')
   */
  readonly providerName: string;

  // ============ LANGUAGE SUPPORT ============

  /**
   * Get all supported programming languages
   */
  getSupportedLanguages(): Promise<ProgrammingLanguage[]>;

  /**
   * Get a specific language by ID
   */
  getLanguage(languageId: string): Promise<ProgrammingLanguage | null>;

  /**
   * Check if a language is supported
   */
  isLanguageSupported(languageId: string): Promise<boolean>;

  // ============ CODE EXECUTION ============

  /**
   * Execute code synchronously (blocks until complete)
   * Best for short executions (<5 seconds)
   */
  execute(request: CodeExecutionRequest): Promise<CodeExecutionResult>;

  /**
   * Execute code asynchronously (returns immediately, poll for result)
   * Best for longer executions
   */
  executeAsync(request: CodeExecutionRequest): Promise<{
    submissionId: string;
    status: 'queued' | 'processing';
  }>;

  /**
   * Get result of async execution
   */
  getExecutionResult(submissionId: string): Promise<CodeExecutionResult | null>;

  /**
   * Execute code against multiple test cases
   */
  executeWithTests(
    request: Omit<CodeExecutionRequest, 'stdin'>,
    testCases: TestCase[],
  ): Promise<BatchTestResult>;

  /**
   * Get batch test result (for async execution)
   */
  getBatchTestResult(submissionId: string): Promise<BatchTestResult | null>;

  // ============ RESOURCE MANAGEMENT ============

  /**
   * Get current queue status
   */
  getQueueStatus(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    workersAvailable: number;
  }>;

  /**
   * Get execution limits for a subscription tier
   */
  getLimitsForTier(tier: string): ExecutionLimits;

  /**
   * Check if user can execute (rate limiting)
   */
  checkRateLimit(userId: string, tier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt?: Date;
    reason?: string;
  }>;

  // ============ HEALTH ============

  /**
   * Health check
   */
  healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    message?: string;
  }>;
}

/**
 * Injection token for the code execution provider
 */
export const CODE_EXECUTION_PROVIDER = Symbol('CODE_EXECUTION_PROVIDER');

/**
 * Configuration for code execution provider selection
 */
export interface CodeExecutionProviderConfig {
  /** Active provider name */
  provider: 'judge0' | 'piston' | 'codesandbox' | 'replit';
  /** Provider-specific configuration */
  config: Record<string, any>;
  /** Default sandbox configuration */
  defaultSandboxConfig?: Partial<SandboxConfig>;
  /** Limits by subscription tier */
  tierLimits?: Record<string, Partial<ExecutionLimits>>;
}

// ============ DEFAULT CONFIGURATIONS ============

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  cpuTimeLimit: 5,
  wallTimeLimit: 15,
  memoryLimit: 256 * 1024, // 256 MB
  stackLimit: 64 * 1024, // 64 MB
  maxOutputSize: 1024, // 1 MB
  maxProcesses: 1,
  enableNetwork: false,
};

export const DEFAULT_TIER_LIMITS: Record<string, ExecutionLimits> = {
  FREE: {
    executionsPerDay: 50,
    executionsPerHour: 10,
    concurrentExecutions: 1,
    cpuTimeLimitPerExecution: 2,
    memoryLimitPerExecution: 128 * 1024, // 128 MB
    maxCodeSize: 10000, // 10K characters
    maxStdinSize: 5000, // 5K characters
  },
  BASIC: {
    executionsPerDay: 500,
    executionsPerHour: 100,
    concurrentExecutions: 2,
    cpuTimeLimitPerExecution: 5,
    memoryLimitPerExecution: 256 * 1024, // 256 MB
    maxCodeSize: 50000, // 50K characters
    maxStdinSize: 20000, // 20K characters
  },
  PRO: {
    executionsPerDay: 5000,
    executionsPerHour: 500,
    concurrentExecutions: 5,
    cpuTimeLimitPerExecution: 10,
    memoryLimitPerExecution: 512 * 1024, // 512 MB
    maxCodeSize: 100000, // 100K characters
    maxStdinSize: 50000, // 50K characters
  },
  ENTERPRISE: {
    executionsPerDay: -1, // Unlimited
    executionsPerHour: -1, // Unlimited
    concurrentExecutions: 10,
    cpuTimeLimitPerExecution: 30,
    memoryLimitPerExecution: 1024 * 1024, // 1 GB
    maxCodeSize: 500000, // 500K characters
    maxStdinSize: 100000, // 100K characters
  },
};
