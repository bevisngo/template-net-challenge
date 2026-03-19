import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UploadedFile } from './entities/file.entity';
import { FileRepository } from './repositories/file.repository';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [TypeOrmModule.forFeature([UploadedFile]), StorageModule, AiModule, RagModule],
  providers: [FileRepository, FilesService],
  controllers: [FilesController],
  exports: [FilesService],
})
export class FilesModule {}
