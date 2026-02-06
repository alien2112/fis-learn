import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CodeSubmissionStatus } from '@prisma/client';

// ============ EXECUTION DTOs ============

export class ExecuteCodeDto {
  @ApiProperty({
    description: 'Source code to execute',
    example: 'print("Hello, World!")',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  sourceCode: string;

  @ApiProperty({
    description: 'Programming language ID',
    example: 'python',
  })
  @IsString()
  languageId: string;

  @ApiPropertyOptional({
    description: 'Standard input for the program',
    example: '42',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  stdin?: string;

  @ApiPropertyOptional({
    description: 'Command line arguments',
    example: ['--verbose', 'input.txt'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];
}

export class GetExecutionResultDto {
  @ApiProperty({ description: 'Submission ID from async execution' })
  @IsString()
  submissionId: string;
}

// ============ EXERCISE DTOs ============

export class TestCaseDto {
  @ApiPropertyOptional({ description: 'Test case name/description' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Input to provide via stdin',
    example: '5\n3',
  })
  @IsString()
  input: string;

  @ApiProperty({
    description: 'Expected output',
    example: '8',
  })
  @IsString()
  expected: string;

  @ApiPropertyOptional({
    description: 'Points for this test case',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({
    description: 'Hide input/output from students',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class CreateExerciseDto {
  @ApiProperty({ description: 'Lesson ID this exercise belongs to' })
  @IsString()
  lessonId: string;

  @ApiProperty({
    description: 'Exercise title',
    example: 'Sum Two Numbers',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Brief description (Markdown)',
    example: 'Write a function that returns the sum of two integers.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Detailed instructions (Markdown)',
    example: '## Instructions\n\nGiven two integers...',
  })
  @IsString()
  instructions: string;

  @ApiProperty({
    description: 'Programming language ID',
    example: 'python',
  })
  @IsString()
  languageId: string;

  @ApiPropertyOptional({
    description: 'Starter code template',
    example: 'def sum(a, b):\n    # Your code here\n    pass',
  })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional({
    description: 'Solution code (hidden from students)',
    example: 'def sum(a, b):\n    return a + b',
  })
  @IsOptional()
  @IsString()
  solutionCode?: string;

  @ApiPropertyOptional({
    description: 'Hints for students',
    example: ['Think about what operator adds numbers', 'Use the + operator'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];

  @ApiPropertyOptional({
    description: 'Difficulty level',
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({
    description: 'Total points for the exercise',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({
    description: 'Time limit in seconds',
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  timeLimit?: number;

  @ApiPropertyOptional({
    description: 'Memory limit in KB',
    default: 256000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(32000)
  @Max(1024000)
  memoryLimit?: number;

  @ApiPropertyOptional({
    description: 'Is this exercise required for course completion?',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Test cases for the exercise',
    type: [TestCaseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases?: TestCaseDto[];
}

export class UpdateExerciseDto {
  @ApiPropertyOptional({ description: 'Exercise title' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Brief description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Detailed instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Programming language ID' })
  @IsOptional()
  @IsString()
  languageId?: string;

  @ApiPropertyOptional({ description: 'Starter code template' })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiPropertyOptional({ description: 'Solution code' })
  @IsOptional()
  @IsString()
  solutionCode?: string;

  @ApiPropertyOptional({ description: 'Hints for students' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hints?: string[];

  @ApiPropertyOptional({
    description: 'Difficulty level',
    enum: ['easy', 'medium', 'hard'],
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @ApiPropertyOptional({ description: 'Total points' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  points?: number;

  @ApiPropertyOptional({ description: 'Time limit in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(30)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Memory limit in KB' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(32000)
  @Max(1024000)
  memoryLimit?: number;

  @ApiPropertyOptional({ description: 'Is required for completion?' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

// ============ TEST CASE DTOs ============

export class AddTestCaseDto {
  @ApiPropertyOptional({ description: 'Test case name/description' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Input to provide via stdin' })
  @IsString()
  input: string;

  @ApiProperty({ description: 'Expected output' })
  @IsString()
  expected: string;

  @ApiPropertyOptional({ description: 'Points for this test case', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ description: 'Hide from students', default: false })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

export class UpdateTestCaseDto {
  @ApiPropertyOptional({ description: 'Test case name/description' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Input to provide via stdin' })
  @IsOptional()
  @IsString()
  input?: string;

  @ApiPropertyOptional({ description: 'Expected output' })
  @IsOptional()
  @IsString()
  expected?: string;

  @ApiPropertyOptional({ description: 'Points for this test case' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ description: 'Hide from students' })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;
}

// ============ SUBMISSION DTOs ============

export class SubmitCodeDto {
  @ApiProperty({
    description: 'Source code to submit',
    example: 'def sum(a, b):\n    return a + b',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  code: string;
}

export class GetSubmissionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: CodeSubmissionStatus,
  })
  @IsOptional()
  @IsEnum(CodeSubmissionStatus)
  status?: CodeSubmissionStatus;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
