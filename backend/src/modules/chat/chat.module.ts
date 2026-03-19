import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { AiModule } from '../ai/ai.module';
import { FilesModule } from '../files/files.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AiModule, FilesModule, RagModule],
  providers: [ConversationRepository, MessageRepository, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}
