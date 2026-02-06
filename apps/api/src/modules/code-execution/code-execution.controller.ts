import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CodeExecutionService } from './code-execution.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { ExecuteCodeDto, GetExecutionResultDto } from './dto';

interface AuthUser {
  id: string;
  email: string;
  role: Role;
  subscriptionTier: string;
}

@ApiTags('Code Execution')
@ApiBearerAuth()
@Controller('code-execution')
export class CodeExecutionController {
  constructor(private readonly codeExecutionService: CodeExecutionService) {}

  // ============ PROVIDER INFO ============

  @Get('provider')
  @ApiOperation({ summary: 'Get current code execution provider info' })
  getProviderInfo() {
    return this.codeExecutionService.getProviderInfo();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check code execution provider health' })
  async healthCheck() {
    return this.codeExecutionService.healthCheck();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get current queue status' })
  async getQueueStatus() {
    return this.codeExecutionService.getQueueStatus();
  }

  // ============ LANGUAGES ============

  @Get('languages')
  @ApiOperation({ summary: 'Get all supported programming languages' })
  @ApiResponse({ status: 200, description: 'List of supported languages' })
  async getSupportedLanguages() {
    return this.codeExecutionService.getSupportedLanguages();
  }

  @Get('languages/:id')
  @ApiOperation({ summary: 'Get a specific programming language by ID' })
  @ApiResponse({ status: 200, description: 'Language details' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getLanguage(@Param('id') id: string) {
    return this.codeExecutionService.getLanguage(id);
  }

  // ============ EXECUTION ============

  @Post('execute')
  @ApiOperation({ summary: 'Execute code synchronously' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  @ApiResponse({ status: 403, description: 'Rate limit exceeded' })
  async executeCode(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExecuteCodeDto,
  ) {
    return this.codeExecutionService.execute(user.id, {
      sourceCode: dto.sourceCode,
      languageId: dto.languageId,
      stdin: dto.stdin,
      args: dto.args,
    });
  }

  @Post('execute/async')
  @ApiOperation({ summary: 'Execute code asynchronously' })
  @ApiResponse({
    status: 200,
    description: 'Submission ID for polling',
  })
  async executeCodeAsync(
    @CurrentUser() user: AuthUser,
    @Body() dto: ExecuteCodeDto,
  ) {
    return this.codeExecutionService.executeAsync(user.id, {
      sourceCode: dto.sourceCode,
      languageId: dto.languageId,
      stdin: dto.stdin,
    });
  }

  @Get('submissions/:id')
  @ApiOperation({ summary: 'Get execution result by submission ID' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getExecutionResult(@Param('id') id: string) {
    return this.codeExecutionService.getExecutionResult(id);
  }

  // ============ RATE LIMITS ============

  @Get('limits')
  @ApiOperation({ summary: 'Get rate limits for current user' })
  async getRateLimits(@CurrentUser() user: AuthUser) {
    const tier = user.subscriptionTier || 'FREE';
    const limits = this.codeExecutionService.getLimitsForTier(tier);
    const rateLimit = await this.codeExecutionService.checkRateLimit(
      user.id,
      tier,
    );

    return {
      tier,
      limits,
      current: {
        allowed: rateLimit.allowed,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    };
  }
}
