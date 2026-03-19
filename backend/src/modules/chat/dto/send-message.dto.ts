import { IsString, IsUUID, IsOptional, MinLength, IsArray } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  @MinLength(1)
  content: string;

  /**
   * Optional file IDs (from /api/files/upload) to include as context.
   * The AI will read and reason about these files when answering.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
