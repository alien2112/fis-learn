import { IsBoolean } from 'class-validator';

export class ToggleMessageFlagDto {
  @IsBoolean()
  value: boolean;
}
