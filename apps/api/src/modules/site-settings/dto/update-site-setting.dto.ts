import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSiteSettingDto {
  @ApiProperty({ example: 'https://example.com/hero.jpg' })
  @IsString()
  @MaxLength(2000)
  value: string;
}

class BulkUpdateItem {
  @IsString()
  key: string;

  @IsString()
  @MaxLength(2000)
  value: string;
}

export class BulkUpdateSiteSettingsDto {
  @ApiProperty({ type: [BulkUpdateItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItem)
  updates: BulkUpdateItem[];
}
