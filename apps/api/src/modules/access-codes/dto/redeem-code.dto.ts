import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RedeemCodeDto {
  @ApiProperty({ example: 'ABC12345', description: 'The access code to redeem' })
  @IsString()
  @IsNotEmpty({ message: 'Access code is required' })
  @Length(6, 20, { message: 'Invalid access code format' })
  code: string;
}
