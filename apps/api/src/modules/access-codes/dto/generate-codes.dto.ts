import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { AccessCodeType } from '@prisma/client';

export class GenerateCodeDto {
  @ApiProperty({ enum: AccessCodeType, example: AccessCodeType.COURSE })
  @IsEnum(AccessCodeType)
  type: AccessCodeType;

  @ApiPropertyOptional({ example: 'course-id', description: 'Required for COURSE type' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 'material-id', description: 'Required for VIDEO type' })
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isSingleUse?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class GenerateBulkCodesDto {
  @ApiProperty({ enum: AccessCodeType, example: AccessCodeType.COURSE })
  @IsEnum(AccessCodeType)
  type: AccessCodeType;

  @ApiPropertyOptional({ example: 'course-id' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 'material-id' })
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiProperty({ example: 10, description: 'Number of codes to generate' })
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isSingleUse?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRedemptions?: number;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
