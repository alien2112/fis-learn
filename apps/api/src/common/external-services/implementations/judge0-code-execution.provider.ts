import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
 * Judge0 Code Execution Provider Implementation
 *
 * Judge0 (https://judge0.com) is a robust, open-source online code execution system.
 * Can be self-hosted or use the cloud service (RapidAPI).
 *
 * Setup Options:
 *
 * 1. Self-hosted (recommended for production):
 *    - Deploy using Docker: https://github.com/judge0/judge0
 *    - Set JUDGE0_API_URL to your instance URL
 *    - No API key needed for self-hosted
 *
 * 2. RapidAPI Cloud:
 *    - Sign up at https://rapidapi.com/judge0-official/api/judge0-ce
 *    - Set JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
 *    - Set JUDGE0_API_KEY to your RapidAPI key
 *    - Set JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
 *
 * Environment Variables:
 * - JUDGE0_API_URL: Base URL of Judge0 API
 * - JUDGE0_API_KEY: API key (for RapidAPI or authenticated self-hosted)
 * - JUDGE0_API_HOST: API host header (for RapidAPI)
 * - JUDGE0_CALLBACK_URL: URL for async execution callbacks
 */
@Injectable()
export class Judge0CodeExecutionProvider implements CodeExecutionProvider {
  private readonly logger = new Logger(Judge0CodeExecutionProvider.name);
  private readonly apiUrl: string;
  private readonly apiKey: string | null;
  private readonly apiHost: string | null;
  private readonly callbackUrl: string | null;
  private languageCache: Map<string, ProgrammingLanguage> = new Map();

  readonly providerName = 'judge0';

  // Judge0 language ID to our language ID mapping
  private readonly languageMapping: Record<number, string> = {
    50: 'c',
    54: 'cpp',
    51: 'csharp',
    62: 'java',
    63: 'javascript',
    70: 'python2',
    71: 'python', // Python 3
    72: 'ruby',
    73: 'rust',
    74: 'typescript',
    78: 'kotlin',
    68: 'php',
    60: 'go',
    83: 'swift',
    85: 'perl',
    46: 'bash',
    89: 'fsharp',
    75: 'c_clang',
    76: 'cpp_clang',
    82: 'sql',
    84: 'r',
    88: 'groovy',
  };

  // Reverse mapping
  private readonly reverseLanguageMapping: Record<string, number> = {};

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('JUDGE0_API_URL', 'http://localhost:2358');
    this.apiKey = this.configService.get<string>('JUDGE0_API_KEY') || null;
    this.apiHost = this.configService.get<string>('JUDGE0_API_HOST') || null;
    this.callbackUrl = this.configService.get<string>('JUDGE0_CALLBACK_URL') || null;

    // Build reverse mapping
    for (const [judge0Id, langId] of Object.entries(this.languageMapping)) {
      this.reverseLanguageMapping[langId] = parseInt(judge0Id, 10);
    }

    this.logger.log(`Judge0 provider initialized with URL: ${this.apiUrl}`);
  }

  // ============ LANGUAGE SUPPORT ============

  async getSupportedLanguages(): Promise<ProgrammingLanguage[]> {
    if (this.languageCache.size > 0) {
      return Array.from(this.languageCache.values());
    }

    try {
      const response = await this.makeRequest('/languages', 'GET');
      const languages: ProgrammingLanguage[] = response
        .filter((lang: any) => this.languageMapping[lang.id])
        .map((lang: any) => this.mapJudge0Language(lang));

      // Cache the languages
      languages.forEach((lang) => this.languageCache.set(lang.id, lang));

      return languages;
    } catch (error) {
      this.logger.error('Failed to fetch languages from Judge0', error);
      return this.getDefaultLanguages();
    }
  }

  async getLanguage(languageId: string): Promise<ProgrammingLanguage | null> {
    // Try cache first
    if (this.languageCache.has(languageId)) {
      return this.languageCache.get(languageId) || null;
    }

    // Load all languages (will populate cache)
    await this.getSupportedLanguages();

    return this.languageCache.get(languageId) || null;
  }

  async isLanguageSupported(languageId: string): Promise<boolean> {
    return this.reverseLanguageMapping[languageId] !== undefined;
  }

  // ============ CODE EXECUTION ============

  async execute(request: CodeExecutionRequest): Promise<CodeExecutionResult> {
    const judge0LanguageId = this.reverseLanguageMapping[request.languageId];
    if (!judge0LanguageId) {
      return {
        id: '',
        status: 'internal_error',
        message: `Unsupported language: ${request.languageId}`,
        createdAt: new Date(),
      };
    }

    const submission = {
      source_code: this.base64Encode(request.sourceCode),
      language_id: judge0LanguageId,
      stdin: request.stdin ? this.base64Encode(request.stdin) : null,
      expected_output: null,
      cpu_time_limit: request.cpuTimeLimit || 5,
      cpu_extra_time: 1,
      wall_time_limit: request.wallTimeLimit || 15,
      memory_limit: request.memoryLimit || 256000,
      stack_limit: request.stackLimit || 64000,
      max_file_size: request.maxOutputSize || 1024,
      enable_network: request.enableNetwork || false,
      compiler_options: request.compilerFlags || null,
      command_line_arguments: request.args?.join(' ') || null,
    };

    try {
      // Create submission and wait for result
      const response = await this.makeRequest(
        '/submissions?base64_encoded=true&wait=true',
        'POST',
        submission,
      );

      return this.mapJudge0Result(response);
    } catch (error: any) {
      this.logger.error('Code execution failed', error);
      return {
        id: '',
        status: 'internal_error',
        message: error.message || 'Execution failed',
        createdAt: new Date(),
      };
    }
  }

  async executeAsync(request: CodeExecutionRequest): Promise<{
    submissionId: string;
    status: 'queued' | 'processing';
  }> {
    const judge0LanguageId = this.reverseLanguageMapping[request.languageId];
    if (!judge0LanguageId) {
      throw new Error(`Unsupported language: ${request.languageId}`);
    }

    const submission = {
      source_code: this.base64Encode(request.sourceCode),
      language_id: judge0LanguageId,
      stdin: request.stdin ? this.base64Encode(request.stdin) : null,
      cpu_time_limit: request.cpuTimeLimit || 5,
      wall_time_limit: request.wallTimeLimit || 15,
      memory_limit: request.memoryLimit || 256000,
      callback_url: request.callbackUrl || this.callbackUrl,
    };

    const response = await this.makeRequest(
      '/submissions?base64_encoded=true',
      'POST',
      submission,
    );

    return {
      submissionId: response.token,
      status: 'queued',
    };
  }

  async getExecutionResult(submissionId: string): Promise<CodeExecutionResult | null> {
    try {
      const response = await this.makeRequest(
        `/submissions/${submissionId}?base64_encoded=true`,
        'GET',
      );

      if (!response) return null;

      return this.mapJudge0Result(response);
    } catch (error) {
      this.logger.error(`Failed to get execution result: ${submissionId}`, error);
      return null;
    }
  }

  async executeWithTests(
    request: Omit<CodeExecutionRequest, 'stdin'>,
    testCases: TestCase[],
  ): Promise<BatchTestResult> {
    const submissionId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testResults: TestCaseResult[] = [];
    let testsPassed = 0;
    let totalPoints = 0;
    let maxPoints = 0;
    const startTime = Date.now();

    // Execute test cases in parallel batches to reduce total latency
    const CONCURRENCY = 5;
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
        status: this.mapStatusToTestStatus(result.status, passed),
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
      averageExecutionTime: testResults.length > 0
        ? testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / testResults.length
        : 0,
      maxMemoryUsed: testResults.length > 0
        ? Math.max(...testResults.map((r) => r.memoryUsed || 0))
        : 0,
      completedAt: new Date(),
    };
  }

  async getBatchTestResult(submissionId: string): Promise<BatchTestResult | null> {
    // For batch execution, we execute synchronously, so this returns null
    // In a more advanced implementation, you'd store batch results in Redis/DB
    return null;
  }

  // ============ RESOURCE MANAGEMENT ============

  async getQueueStatus(): Promise<{
    queueLength: number;
    averageWaitTime: number;
    workersAvailable: number;
  }> {
    try {
      const response = await this.makeRequest('/statistics', 'GET');

      return {
        queueLength: response.submissions_in_queue || 0,
        averageWaitTime: response.average_wait_time || 0,
        workersAvailable: response.workers_available || 0,
      };
    } catch (error) {
      return {
        queueLength: 0,
        averageWaitTime: 0,
        workersAvailable: 1,
      };
    }
  }

  getLimitsForTier(tier: string): ExecutionLimits {
    return DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.FREE;
  }

  async checkRateLimit(
    userId: string,
    tier: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt?: Date;
    reason?: string;
  }> {
    // In production, implement with Redis
    // For now, always allow
    const limits = this.getLimitsForTier(tier);

    return {
      allowed: true,
      remaining: limits.executionsPerHour,
    };
  }

  // ============ HEALTH ============

  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    message?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.makeRequest('/languages', 'GET');
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error: any) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        message: error.message,
      };
    }
  }

  // ============ PRIVATE HELPERS ============

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST',
    body?: any,
  ): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // RapidAPI headers
    if (this.apiKey) {
      headers['X-RapidAPI-Key'] = this.apiKey;
    }
    if (this.apiHost) {
      headers['X-RapidAPI-Host'] = this.apiHost;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Judge0 API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private mapJudge0Result(response: any): CodeExecutionResult {
    const statusId = response.status?.id || 0;

    return {
      id: response.token || '',
      status: this.mapJudge0Status(statusId),
      stdout: response.stdout ? this.base64Decode(response.stdout) : undefined,
      stderr: response.stderr ? this.base64Decode(response.stderr) : undefined,
      compileOutput: response.compile_output
        ? this.base64Decode(response.compile_output)
        : undefined,
      exitCode: response.exit_code,
      exitSignal: response.exit_signal,
      executionTime: parseFloat(response.time) || undefined,
      wallTime: parseFloat(response.wall_time) || undefined,
      memoryUsed: response.memory,
      message: response.status?.description,
      statusDescription: response.status?.description,
      createdAt: new Date(response.created_at || Date.now()),
      finishedAt: response.finished_at ? new Date(response.finished_at) : undefined,
      providerData: {
        token: response.token,
        statusId,
      },
    };
  }

  private mapJudge0Status(statusId: number): CodeExecutionStatus {
    // Judge0 status IDs:
    // 1 - In Queue, 2 - Processing, 3 - Accepted
    // 4 - Wrong Answer, 5 - Time Limit Exceeded, 6 - Compilation Error
    // 7 - Runtime Error (SIGSEGV), 8 - Runtime Error (SIGXFSZ)
    // 9 - Runtime Error (SIGFPE), 10 - Runtime Error (SIGABRT)
    // 11 - Runtime Error (NZEC), 12 - Runtime Error (Other)
    // 13 - Internal Error, 14 - Exec Format Error

    const statusMap: Record<number, CodeExecutionStatus> = {
      1: 'queued',
      2: 'processing',
      3: 'accepted',
      4: 'wrong_answer',
      5: 'time_limit_exceeded',
      6: 'compilation_error',
      7: 'runtime_error',
      8: 'runtime_error',
      9: 'runtime_error',
      10: 'runtime_error',
      11: 'runtime_error',
      12: 'runtime_error',
      13: 'internal_error',
      14: 'runtime_error',
    };

    return statusMap[statusId] || 'internal_error';
  }

  private mapStatusToTestStatus(
    status: CodeExecutionStatus,
    passed: boolean,
  ): CodeExecutionStatus {
    if (passed && status === 'accepted') return 'accepted';
    if (status === 'accepted' && !passed) return 'wrong_answer';
    return status;
  }

  private mapJudge0Language(lang: any): ProgrammingLanguage {
    const langId = this.languageMapping[lang.id] || `lang_${lang.id}`;

    const extensionMap: Record<string, string> = {
      c: 'c',
      c_clang: 'c',
      cpp: 'cpp',
      cpp_clang: 'cpp',
      csharp: 'cs',
      java: 'java',
      javascript: 'js',
      python: 'py',
      python2: 'py',
      ruby: 'rb',
      rust: 'rs',
      typescript: 'ts',
      kotlin: 'kt',
      php: 'php',
      go: 'go',
      swift: 'swift',
      perl: 'pl',
      bash: 'sh',
      sql: 'sql',
      r: 'r',
      fsharp: 'fs',
      groovy: 'groovy',
    };

    const monacoMap: Record<string, string> = {
      c: 'c',
      c_clang: 'c',
      cpp: 'cpp',
      cpp_clang: 'cpp',
      csharp: 'csharp',
      java: 'java',
      javascript: 'javascript',
      python: 'python',
      python2: 'python',
      ruby: 'ruby',
      rust: 'rust',
      typescript: 'typescript',
      kotlin: 'kotlin',
      php: 'php',
      go: 'go',
      swift: 'swift',
      perl: 'perl',
      bash: 'shell',
      sql: 'sql',
      r: 'r',
      fsharp: 'fsharp',
      groovy: 'groovy',
    };

    return {
      id: langId,
      name: lang.name,
      version: this.extractVersion(lang.name),
      extension: extensionMap[langId] || 'txt',
      monacoLanguage: monacoMap[langId] || 'plaintext',
      isCompiled: ['c', 'c_clang', 'cpp', 'cpp_clang', 'csharp', 'java', 'rust', 'kotlin', 'go', 'swift'].includes(langId),
      defaultTemplate: this.getDefaultTemplate(langId),
      helloWorld: this.getHelloWorld(langId),
    };
  }

  private extractVersion(name: string): string {
    const match = name.match(/[\d.]+/);
    return match ? match[0] : 'latest';
  }

  private getDefaultTemplate(langId: string): string {
    const templates: Record<string, string> = {
      python: '# Write your Python code here\n\n',
      javascript: '// Write your JavaScript code here\n\n',
      typescript: '// Write your TypeScript code here\n\n',
      java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      cpp_clang: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      c: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      c_clang: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n',
      csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        // Write your code here\n    }\n}\n',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n}\n',
      rust: 'fn main() {\n    // Write your code here\n}\n',
      ruby: '# Write your Ruby code here\n\n',
      kotlin: 'fun main() {\n    // Write your code here\n}\n',
    };

    return templates[langId] || '// Write your code here\n';
  }

  private getHelloWorld(langId: string): string {
    const helloWorlds: Record<string, string> = {
      python: 'print("Hello, World!")',
      javascript: 'console.log("Hello, World!");',
      typescript: 'console.log("Hello, World!");',
      java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
      cpp_clang: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
      c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      c_clang: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
      csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}',
      go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
      rust: 'fn main() {\n    println!("Hello, World!");\n}',
      ruby: 'puts "Hello, World!"',
      kotlin: 'fun main() {\n    println("Hello, World!")\n}',
    };

    return helloWorlds[langId] || 'Hello, World!';
  }

  private getDefaultLanguages(): ProgrammingLanguage[] {
    return [
      {
        id: 'python',
        name: 'Python 3',
        version: '3.10',
        extension: 'py',
        monacoLanguage: 'python',
        isCompiled: false,
        defaultTemplate: this.getDefaultTemplate('python'),
        helloWorld: this.getHelloWorld('python'),
      },
      {
        id: 'javascript',
        name: 'JavaScript (Node.js)',
        version: '18',
        extension: 'js',
        monacoLanguage: 'javascript',
        isCompiled: false,
        defaultTemplate: this.getDefaultTemplate('javascript'),
        helloWorld: this.getHelloWorld('javascript'),
      },
      {
        id: 'java',
        name: 'Java',
        version: '17',
        extension: 'java',
        monacoLanguage: 'java',
        isCompiled: true,
        defaultTemplate: this.getDefaultTemplate('java'),
        helloWorld: this.getHelloWorld('java'),
      },
      {
        id: 'cpp',
        name: 'C++',
        version: '17',
        extension: 'cpp',
        monacoLanguage: 'cpp',
        isCompiled: true,
        defaultTemplate: this.getDefaultTemplate('cpp'),
        helloWorld: this.getHelloWorld('cpp'),
      },
    ];
  }

  private base64Encode(str: string): string {
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  private base64Decode(str: string): string {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
}
