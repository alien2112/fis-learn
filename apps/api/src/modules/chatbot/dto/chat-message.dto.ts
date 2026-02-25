import { IsArray, IsIn, IsString, MaxLength, ArrayMaxSize, ValidateNested, IsOptional, IsNotEmpty, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MinLength(1, { message: 'Message content must have at least 1 character' })
  @MaxLength(2000, { message: 'Message content cannot exceed 2000 characters' })
  content: string;
}

export class ChatMessageDto {
  @IsArray({ message: 'Messages must be an array' })
  @ArrayMaxSize(20, { message: 'Cannot send more than 20 messages at once' })
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];
}

export class AuthenticatedChatMessageDto extends ChatMessageDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  exerciseId?: string;
}
