import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsEnum, Min, MaxLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType } from '@prisma/client';

export class RejectCourseDto {
  @ApiProperty({ example: 'Course content needs more detail in section 2' })
  @IsString()
  @MaxLength(2000, { message: 'Feedback must not exceed 2000 characters' })
  feedback: string;
}

export class CreateSectionDto {
  @ApiProperty({ example: 'Getting Started' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Introduction to the course' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: 'Getting Started' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Introduction to the course' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction Video' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Welcome to the course!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: ContentType, example: ContentType.VIDEO })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiPropertyOptional({ example: 'material-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateLessonDto {
  @ApiPropertyOptional({ example: 'Introduction Video' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Welcome to the course!' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ContentType })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiPropertyOptional({ example: 'material-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFreePreview?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class AssignInstructorsDto {
  @ApiProperty({ example: ['instructor-id-1', 'instructor-id-2'] })
  @IsArray()
  @IsString({ each: true })
  instructorIds: string[];

  @ApiPropertyOptional({ example: 'instructor-id-1' })
  @IsOptional()
  @IsString()
  primaryInstructorId?: string;
}
