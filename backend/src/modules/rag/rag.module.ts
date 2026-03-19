import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { AiModule } from '../ai/ai.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AiModule, StorageModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
