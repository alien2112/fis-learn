import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommunityChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEnum(CommunityChannelType)
  type: CommunityChannelType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;
}
