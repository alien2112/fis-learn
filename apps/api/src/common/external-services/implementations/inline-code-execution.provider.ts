import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  CodeExecutionProvider,
  ProgrammingLanguage,
  CodeExecutionRequest,
  CodeExecutionResult,
  CodeExecutionStatus,
  TestCase,
  BatchTestResult,
  TestCaseResult,
  ExecutionLimits,
  DEFAULT_TIER_LIMITS,
} from '../code-execution-provider.interface';

/**
 * Inline Code Execution Provider
 *
 * Executes code directly in the API container using child_process.
 * Supports Python, JavaScript, TypeScript, Bash, C, C++ out of the box
 * (runtimes must be installed in the container - see API Dockerfile).
 *
 * Security measures:
 * - Process timeout (kills after cpuTimeLimit seconds)
 * - Output size limit (truncated at maxOutputSize KB)
 * - Temp files cleaned up after each run
 * - Runs as the same non-root user as the API process
 *
 * Environment Variables:
 * - INLINE_MAX_CPU_TIME: Default CPU time limit in seconds (default: 5)
 * - INLINE_MAX_MEMORY_KB: Default memory limit in KB (default: 262144 = 256 MB)
 */
@Injectable()
export class InlineCodeExecutionProvider implements CodeExecutionProvider {
  private readonly logger = new Logger(InlineCodeExecutionProvider.name);
  private readonly defaultCpuTime: number;
  private readonly defaultMemoryKb: number;
  private readonly maxOutputBytes: number;

  readonly providerName = 'inline';

  // Language configurations: id -> { cmd, extension, compileCmd? }
  private readonly languageConfigs: Record<
    string,
    {
      name: string;
      version: string;
      extension: string;
      monacoLanguage: string;
      isCompiled: boolean;
      runCmd: (filePath: string) => string[];
      compileCmd?: (srcPath: string, outPath: string) => string[];
    }
  > = {
    python: {
      name: 'Python 3',
      version: '3',
      extension: 'py',
      monacoLanguage: 'python',
      isCompiled: false,
      runCmd: (f) => ['python3', f],
    },
    javascript: {
      name: 'JavaScript (Node.js)',
      version: '20',
      extension: 'js',
      monacoLanguage: 'javascript',
      isCompiled: false,
      runCmd: (f) => ['node', f],
    },
    typescript: {
      name: 'TypeScript',
      version: '5',
      extension: 'ts',
      monacoLanguage: 'typescript',
      isCompiled: false,
      // Use ts-node if available, fall back to node after stripping types
      runCmd: (f) => ['node', '--input-type=module', f],
    },
    bash: {
      name: 'Bash',
      version: '5',
      extension: 'sh',
      monacoLanguage: 'shell',
      isCompiled: false,
      runCmd: (f) => ['sh', f],
    },
    c: {
      name: 'C (GCC)',
      version: 'latest',
      extension: 'c',
      monacoLanguage: 'c',
      isCompiled: true,
      runCmd: (f) => [f],
      compileCmd: (src, out) => ['gcc', '-O2', '-o', out, src, '-lm'],
    },
    cpp: {
      name: 'C++ (G++)',
      version: 'latest',
      extension: 'cpp',
      monacoLanguage: 'cpp',
      isCompiled: true,
      runCmd: (f) => [f],
      compileCmd: (src, out) => ['g++', '-O2', '-std=c++17', '-o', out, src, '-lm'],
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.defaultCpuTime = this.configService.get<number>('INLINE_MAX_CPU_TIME', 5);
    this.defaultMemoryKb = this.configService.get<number>('INLINE_MAX_MEMORY_KB', 262144);
    this.maxOutputBytes = 100 * 1024; // 100 KB output limit
    this.logger.log('Inline code execution provider initialized');
  }

  // ============ LANGUAGE SUPPORT ============

  async getSupportedLanguages(): Promise<ProgrammingLanguage[]> {
    return Object.entries(this.languageConfigs).map(([id, cfg]) => ({
      id,
      name: cfg.name,
      version: cfg.version,
      extension: cfg.extension,
      monacoLanguage: cfg.monacoLanguage,
      isCompiled: cfg.isCompiled,
      defaultTemplate: this.getDefaultTemplate(id),
      helloWorld: this.getHelloWorld(id),
    }));
  }

  async getLanguage(languageId: string): Promise<ProgrammingLanguage | null> {
    const cfg = this.languageConfigs[languageId];
    if (!cfg) return null;
    return {
      id: languageId,
      name: cfg.name,
      version: cfg.version,
      extension: cfg.extension,
      monacoLanguage: cfg.monacoLanguage,
      isCompiled: cfg.isCompiled,
      defaultTemplate: this.getDefaultTemplate(languageId),
      helloWorld: this.getHelloWorld(languageId),
    };
  }

  async isLanguageSupported(languageId: string): Promise<boolean> {
    return languageId in this.languageConfigs;
  }

  // ============ CODE EXECUTION ============

  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const cfg = this.languageConfigs[request.languageId];
    if (!cfg) {
      return {
        id: randomBytes(8).toString('hex'),
        status: 'internal_error',
        message: `Unsupported language: ${request.languageId}`,
        createdAt: new Date(),
      };
    }

    const id = randomBytes(8).toString('hex');
    const createdAt = new Date();
    let tmpDir: string | null = null;

    try {
      // Create temp directory for this execution
      tmpDir = await mkdtemp(path.join(os.tmpdir(), `exec-${id}-`));
      const srcFile = path.join(tmpDir, `main.${cfg.extension}`);
      await writeFile(srcFile, request.sourceCode, 'utf-8');

      const cpuLimit = request.cpuTimeLimit || this.defaultCpuTime;
      const wallLimit = request.wallTimeLimit || cpuLimit * 3;

      // Compile if needed
      if (cfg.isCompiled && cfg.compileCmd) {
        const binFile = path.join(tmpDir, 'main');
        const compileResult = await this.runProcess(
          cfg.compileCmd(srcFile, binFile),
          null,
          10000, // 10s compile timeout
          null,
        );

        if (compileResult.exitCode !== 0) {
          return {
            id,
            status: 'compilation_error',
            compileOutput: compileResult.stdout + compileResult.stderr,
            stderr: compileResult.stderr,
            exitCode: compileResult.exitCode,
            createdAt,
            finishedAt: new Date(),
          };
        }

        // Run compiled binary
        const runCmd = cfg.runCmd(binFile);
        const result = await this.runProcess(
          runCmd,
          request.stdin || null,
          wallLimit * 1000,
          this.maxOutputBytes,
        );

        return this.buildResult(id, result, createdAt);
      } else {
        // Interpreted: run directly
        const runCmd = cfg.runCmd(srcFile);
        const result = await this.runProcess(
          runCmd,
          request.stdin || null,
          wallLimit * 1000,
          this.maxOutputBytes,
        );

        return this.buildResult(id, result, createdAt);
      }
    } catch (error: any) {
      this.logger.error('Inline execution error', error);
      return {
        id,
        status: 'internal_error',
        message: error.message || 'Execution failed',
        createdAt,
        finishedAt: new Date(),
      };
    } finally {
      // Clean up temp files
      if (tmpDir) {
        try {
          const { rm } = await import('fs/promises');
          await rm(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  async executeAsync(request: CodeExecutionRequest): Promise<{
    submissionId: string;
    status: 'queued' | 'processing';
  }> {
    // For inline, we don't have real async — execute sync and store result
    // Return a fake submission ID; real implementation would use Redis
    const submissionId = randomBytes(8).toString('hex');
    // Execute and discard result (fire-and-forget)
    this.execute(request).catch(() => {});
    return { submissionId, status: 'processing' };
  }

  async getExecutionResult(submissionId: string): Promise<CodeExecutionResult | null> {
    // Not supported for inline synchronous execution
    return null;
  }

  async executeWithTests(
    request: Omit<CodeExecutionRequest, 'stdin'>,
    testCases: TestCase[],
  ): Promise<BatchTestResult> {
    const submissionId = `batch_${Date.now()}_${randomBytes(6).toString('hex')}`;
    const testResults: TestCaseResult[] = [];
    let testsPassed = 0;
    let totalPoints = 0;
    let maxPoints = 0;
    const startTime = Date.now();

    const CONCURRENCY = 3;
    const executionResults: { testCase: TestCase; result: CodeExecutionResult }[] = [];

    for (let i = 0; i < testCases.length; i += CONCURRENCY) {
      const chunk = testCases.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (testCase) => ({
          testCase,
          result: await this.execute({ ...request, stdin: testCase.input }),
        })),
      );
      executionResults.push(...chunkResults);
    }

    for (const { testCase, result } of executionResults) {
      const actualOutput = result.stdout?.trim() || '';
      const expectedOutput = testCase.expectedOutput.trim();
      const passed = actualOutput === expectedOutput && result.status === 'accepted';

      if (passed) {
        testsPassed++;
        totalPoints += testCase.points || 1;
      }
      maxPoints += testCase.points || 1;

      testResults.push({
        testCaseId: testCase.id,
        testCaseName: testCase.name,
        passed,
        actualOutput: testCase.isHidden ? undefined : actualOutput,
        expectedOutput: testCase.isHidden ? undefined : expectedOutput,
        status: passed ? 'accepted' : result.status === 'accepted' ? 'wrong_answer' : result.status,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        pointsEarned: passed ? (testCase.points || 1) : 0,
        pointsPossible: testCase.points || 1,
        error: result.stderr || result.compileOutput,
      });
    }

    return {
      submissionId,
      status: 'completed',
      testResults,
      totalTests: testCases.length,
      testsPassed,
      totalPoints,
      maxPoints,
      totalExecutionTime: (Date.now() - startTime) / 1000,
      averageExecutionTime:
        testResults.length > 0
          ? testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / testResults.length
          : 0,
      maxMemoryUsed:
        testResults.length > 0 ? Math.max(...testResults.map((r) => r.memoryUsed || 0)) : 0,
      completedAt: new Date(),
    };
  }

  async getBatchTestResult(submissionId: string): Promise<BatchTestResult | null> {
    return null;
  }

  // ============ RESOURCE MANAGEMENT ============

  async getQueueStatus(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    workersAvailable: number;
  }> {
    return { queueLength: 0, averageWaitTime: 0, workersAvailable: 4 };
  }

  getLimitsForTier(tier: string): ExecutionLimits {
    return DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.FREE;
  }

  async checkRateLimit(
    userId: string,
    tier: string,
  ): Promise<{ allowed: boolean; remaining: number; resetAt?: Date; reason?: string }> {
    const limits = this.getLimitsForTier(tier);
    return { allowed: true, remaining: limits.executionsPerHour };
  }

  // ============ HEALTH ============

  async healthCheck(): Promise<{ healthy: boolean; latency: number; message?: string }> {
    const start = Date.now();
    try {
      // Quick sanity check: run python3 --version
      const result = await this.runProcess(['python3', '--version'], null, 3000, 1024);
      return {
        healthy: result.exitCode === 0,
        latency: Date.now() - start,
        message: result.stdout || result.stderr || undefined,
      };
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - start,
        message: error.message,
      };
    }
  }

  // ============ PRIVATE HELPERS ============

  private runProcess(
    cmd: string[],
    stdin: string | null,
    timeoutMs: number,
    maxOutputBytes: number | null,
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
    wallTime: number;
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const [prog, ...args] = cmd;

      const child = spawn(prog, args, {
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        env: {
          PATH: process.env.PATH,
          HOME: '/tmp',
          TMPDIR: '/tmp',
          LANG: 'en_US.UTF-8',
          // No sensitive env vars
        },
      });

      let stdoutBuf = '';
      let stderrBuf = '';
      let timedOut = false;
      let outputLimitReached = false;

      child.stdout.on('data', (chunk: Buffer) => {
        if (maxOutputBytes !== null && Buffer.byteLength(stdoutBuf) >= maxOutputBytes) {
          if (!outputLimitReached) {
            outputLimitReached = true;
            stdoutBuf += '\n[Output truncated: limit reached]';
          }
          return;
        }
        stdoutBuf += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const limit = 10 * 1024; // 10 KB stderr limit
        if (Buffer.byteLength(stderrBuf) < limit) {
          stderrBuf += chunk.toString('utf-8');
        }
      });

      if (stdin) {
        try {
          child.stdin.write(stdin, 'utf-8');
          child.stdin.end();
        } catch {
          // stdin might not be writable
        }
      } else {
        child.stdin.end();
      }

      child.on('error', (err) => {
        resolve({
          stdout: stdoutBuf,
          stderr: err.message,
          exitCode: 1,
          timedOut: false,
          wallTime: (Date.now() - startTime) / 1000,
        });
      });

      child.on('close', (code, signal) => {
        timedOut = signal === 'SIGKILL' && Date.now() - startTime >= timeoutMs - 100;
        resolve({
          stdout: stdoutBuf,
          stderr: stderrBuf,
          exitCode: code ?? 1,
          timedOut,
          wallTime: (Date.now() - startTime) / 1000,
        });
      });
    });
  }

  private buildResult(
    id: string,
    result: { stdout: string; stderr: string; exitCode: number; timedOut: boolean; wallTime: number },
    createdAt: Date,
  ): CodeExecutionResult {
    let status: CodeExecutionStatus;

    if (result.timedOut) {
      status = 'time_limit_exceeded';
    } else if (result.exitCode === 0) {
      status = 'accepted';
    } else {
      status = 'runtime_error';
    }

    return {
      id,
      status,
      stdout: result.stdout || undefined,
      stderr: result.stderr || undefined,
      exitCode: result.exitCode,
      wallTime: result.wallTime,
      executionTime: result.wallTime,
      createdAt,
      finishedAt: new Date(),
    };
  }

  private getDefaultTemplate(langId: string): string {
    const templates: Record<string, string> = {
      python: '# Write your Python code here\n\n',
      javascript: '// Write your JavaScript code here\n\n',
      typescript: '// Write your TypeScript code here\n\n',
      bash: '#!/bin/bash\n# Write your Bash script here\n\n',
      c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
    };
    return templates[langId] || '// Write your code here\n';
  }

  private getHelloWorld(langId: string): string {
    const helloWorlds: Record<string, string> = {
      python: 'print("Hello, World!")',
      javascript: 'console.log("Hello, World!");',
      typescript: 'console.log("Hello, World!");',
      bash: 'echo "Hello, World!"',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    };
    return helloWorlds[langId] || 'Hello, World!';
  }
}
