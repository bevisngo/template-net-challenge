import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { UploadedFile, FileStatus } from './entities/file.entity';
import { FileRepository } from './repositories/file.repository';
import { MinioService } from '../storage/minio.service';
import { GeminiService } from '../ai/gemini.service';
import { RagService } from '../rag/rag.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly fileRepository: FileRepository,
    private minioService: MinioService,
    private geminiService: GeminiService,
    private ragService: RagService,
  ) {}

  /**
   * Full upload pipeline (binary multipart — legacy endpoint):
   *  1. Store binary in MinIO
   *  2. Save DB record (PROCESSING)
   *  3. Index in both Gemini Files API + Qdrant RAG asynchronously
   */
  async upload(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    size: number,
  ): Promise<UploadedFile> {
    const objectKey = `${userId}/${uuidv4()}${extname(originalName)}`;

    this.logger.log(`[upload] START — userId=${userId} file="${originalName}" mimeType=${mimeType} size=${size}B`);

    await this.minioService.upload(buffer, objectKey, mimeType);
    this.logger.log(`[upload] stored in MinIO: ${objectKey}`);

    const record = await this.fileRepository.save(
      this.fileRepository.create({
        userId,
        originalName,
        mimeType,
        size,
        minioKey: objectKey,
        status: FileStatus.PROCESSING,
      }),
    );

    this.logger.log(`[upload] DB record created — fileId=${record.id} status=PROCESSING`);

    // Run both indexing pipelines in parallel, async — don't block HTTP response
    this.indexAsync(record, buffer).catch(() => null);

    this.logger.log(`[upload] DONE (HTTP response returned) — indexing continues in background`);
    return record;
  }

  // ─── Presigned Upload Flow ────────────────────────────────────────────────────

  /**
   * Step 1 — Client requests an upload slot.
   * Creates a DB record (PROCESSING) and returns a MinIO presigned PUT URL.
   */
  async initiateUpload(
    userId: string,
    originalName: string,
    mimeType: string,
    size: number,
  ): Promise<{ fileId: string; uploadUrl: string }> {
    const objectKey = `${userId}/${uuidv4()}${extname(originalName)}`;

    const record = await this.fileRepository.save(
      this.fileRepository.create({
        userId,
        originalName,
        mimeType,
        size,
        minioKey: objectKey,
        status: FileStatus.PROCESSING,
      }),
    );

    const uploadUrl = await this.minioService.getPresignedPutUrl(objectKey);

    this.logger.log(`Presigned PUT URL created for file ${record.id} → ${objectKey}`);
    return { fileId: record.id, uploadUrl };
  }

  /**
   * Step 2 — Client calls this after the PUT to MinIO succeeds.
   * Downloads the buffer from MinIO and triggers async indexing in both pipelines.
   */
  async confirmUpload(fileId: string, userId: string): Promise<UploadedFile> {
    const record = await this.getFile(fileId, userId);

    if (record.status !== FileStatus.PROCESSING) {
      throw new BadRequestException('File is not in a pending state');
    }

    const buffer = await this.minioService.getBuffer(record.minioKey);
    this.logger.log(`[confirmUpload] buffer fetched from MinIO — ${buffer.length}B`);

    this.logger.log(`[confirmUpload] triggering async indexing for file ${record.id}`);
    this.indexAsync(record, buffer).catch(() => null);

    return record;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  getUserFiles(userId: string): Promise<UploadedFile[]> {
    return this.fileRepository.findByUser(userId);
  }

  async getFile(id: string, userId: string): Promise<UploadedFile> {
    const file = await this.fileRepository.findById(id);
    if (!file) throw new NotFoundException('File not found');
    if (file.userId !== userId) throw new ForbiddenException();
    return file;
  }

  async getFilesByIds(ids: string[], userId: string): Promise<UploadedFile[]> {
    if (!ids.length) return [];
    const files = await this.fileRepository.findByIds(ids);
    if (files.some((f) => f.userId !== userId)) throw new ForbiddenException();
    return files;
  }

  async getPresignedUrl(id: string, userId: string): Promise<{ url: string }> {
    const file = await this.getFile(id, userId);
    const url = await this.minioService.getPresignedUrl(file.minioKey);
    return { url };
  }

  async delete(id: string, userId: string): Promise<void> {
    const file = await this.getFile(id, userId);

    await Promise.allSettled([
      this.minioService.delete(file.minioKey),
      file.geminiFileName ? this.geminiService.deleteFile(file.geminiFileName) : Promise.resolve(),
      this.ragService.deleteFile(file.id),
    ]);

    await this.fileRepository.remove(file);
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  /**
   * Run both indexing pipelines concurrently:
   *  - Gemini Files API  → stores geminiFileUri (valid 48h)
   *  - Qdrant RAG        → chunks + embeddings (permanent)
   *
   * File status becomes READY if at least one pipeline succeeds, FAILED if both fail.
   */
  private async indexAsync(record: UploadedFile, buffer: Buffer): Promise<void> {
    const start = Date.now();
    this.logger.log(`[indexAsync] START — fileId=${record.id} "${record.originalName}"`);

    const [geminiResult, ragResult] = await Promise.allSettled([
      this.indexInGemini(record, buffer),
      this.ragService.indexFile(record, buffer),
    ]);

    const geminiOk = geminiResult.status === 'fulfilled';
    const ragOk = ragResult.status === 'fulfilled';

    if (!geminiOk) {
      this.logger.error(`Gemini indexing failed for file ${record.id}`, (geminiResult as PromiseRejectedResult).reason?.message);
    }
    if (!ragOk) {
      this.logger.error(`RAG indexing failed for file ${record.id}`, (ragResult as PromiseRejectedResult).reason?.message);
    }

    if (geminiOk || ragOk) {
      if (!geminiOk) {
        await this.fileRepository.update(record.id, { status: FileStatus.READY });
      }
      this.logger.log(
        `[indexAsync] DONE — fileId=${record.id} gemini=${geminiOk ? 'ok' : 'failed'} rag=${ragOk ? 'ok' : 'failed'} total=${Date.now() - start}ms`,
      );
    } else {
      await this.fileRepository.update(record.id, { status: FileStatus.FAILED });
      this.logger.error(`[indexAsync] BOTH pipelines failed — fileId=${record.id} status=FAILED`);
    }
  }

  private async indexInGemini(record: UploadedFile, buffer: Buffer): Promise<void> {
    this.logger.log(`[indexInGemini] uploading to Gemini Files API — fileId=${record.id}`);
    const start = Date.now();
    const { uri, name } = await this.geminiService.uploadFile(buffer, record.mimeType, record.originalName);

    await this.fileRepository.update(record.id, {
      geminiFileUri: uri,
      geminiFileName: name,
      geminiUploadedAt: new Date(),
      status: FileStatus.READY,
    });

    this.logger.log(`[indexInGemini] DONE — fileId=${record.id} geminiName=${name} took=${Date.now() - start}ms`);
  }
}
