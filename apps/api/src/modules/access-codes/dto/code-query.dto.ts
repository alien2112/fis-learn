import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AccessCodeType, AccessCodeStatus } from '@prisma/client';

export class CodeQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'ABC123' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AccessCodeType })
  @IsOptional()
  @IsEnum(AccessCodeType)
  type?: AccessCodeType;

  @ApiPropertyOptional({ enum: AccessCodeStatus })
  @IsOptional()
  @IsEnum(AccessCodeStatus)
  status?: AccessCodeStatus;

  @ApiPropertyOptional({ example: 'course-id' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 'material-id' })
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter expired codes' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  expired?: boolean;

  @ApiPropertyOptional({ example: 'createdAt', default: 'createdAt' })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'code', 'status', 'expiresAt', 'currentRedemptions'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ example: 'desc', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
