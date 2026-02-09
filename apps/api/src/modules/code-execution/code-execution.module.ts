import { Module, DynamicModule, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { CODE_EXECUTION_PROVIDER } from '../../common/external-services';
import { Judge0CodeExecutionProvider } from '../../common/external-services/implementations/judge0-code-execution.provider';
import { CodeExecutionService } from './code-execution.service';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExerciseService } from './code-exercise.service';
import { CodeExerciseController } from './code-exercise.controller';
import { CoursesModule } from '../courses/courses.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Code Execution Module
 *
 * Provides code execution functionality for programming courses.
 * The execution provider can be swapped by changing environment variables.
 *
 * Supported Providers:
 * - judge0 (default): Judge0 - Open source, self-hostable or RapidAPI
 * - piston: Piston - Fast, open source executor
 *
 * Setup for Judge0 (Self-hosted - RECOMMENDED for production):
 * ```bash
 * # Clone and run Judge0 with Docker
 * git clone https://github.com/judge0/judge0
 * cd judge0 && docker-compose up -d
 * ```
 *
 * Environment Variables:
 * ```
 * CODE_EXECUTION_PROVIDER=judge0
 * JUDGE0_API_URL=http://localhost:2358  # Self-hosted
 * # Or for RapidAPI:
 * JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
 * JUDGE0_API_KEY=your-rapidapi-key
 * JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
 * ```
 *
 * Rate Limiting:
 * - FREE tier: 50 executions/day
 * - BASIC tier: 500 executions/day
 * - PRO tier: 5000 executions/day
 * - ENTERPRISE: Unlimited
 */
@Module({})
export class CodeExecutionModule {
  static forRoot(): DynamicModule {
    return {
      module: CodeExecutionModule,
      imports: [ConfigModule, PrismaModule, forwardRef(() => CoursesModule), forwardRef(() => NotificationsModule)],
      controllers: [CodeExecutionController, CodeExerciseController],
      providers: [
        CodeExecutionService,
        CodeExerciseService,

        // Code Execution Provider (provider-agnostic)
        {
          provide: CODE_EXECUTION_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const provider = configService.get<string>('CODE_EXECUTION_PROVIDER', 'judge0');

            switch (provider) {
              case 'judge0':
              default:
                return new Judge0CodeExecutionProvider(configService);

              // Add more providers as they're implemented:
              // case 'piston':
              //   return new PistonCodeExecutionProvider(configService);
            }
          },
          inject: [ConfigService],
        },
      ],
      exports: [CodeExecutionService, CodeExerciseService, CODE_EXECUTION_PROVIDER],
    };
  }
}
