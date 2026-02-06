import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({ enum: Role, example: Role.INSTRUCTOR })
  @IsEnum(Role, { message: 'Invalid role' })
  role: Role;
}
