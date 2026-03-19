import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { QdrantService } from './qdrant.service';

@Module({
  providers: [MinioService, QdrantService],
  exports: [MinioService, QdrantService],
})
export class StorageModule {}
