import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  /** Client for internal operations (connects to MinIO via internal endpoint) */
  private readonly client: Minio.Client;
  /** Client for presigned URLs — uses public endpoint so the signature matches the browser's Host header */
  private readonly presignClient: Minio.Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET || 'templatenet-files';

    const common = {
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    };

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      ...common,
    });

    // Presigned URLs must be signed with the host the browser will use.
    // AWS SigV4 includes Host in the signature; mismatched host → 403.
    // region is required to skip getBucketRegionAsync (network call) — the presignClient
    // uses localhost which may be unreachable from inside Docker.
    const publicHost = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
    const publicPort = process.env.MINIO_PUBLIC_PORT || process.env.MINIO_PORT || '9000';
    this.presignClient = new Minio.Client({
      endPoint: publicHost,
      port: parseInt(String(publicPort)) || 9000,
      region: 'us-east-1', // MinIO default; avoids region lookup (which would fail from Docker)
      ...common,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Bucket "${this.bucket}" created`);
      } else {
        this.logger.log(`Bucket "${this.bucket}" already exists`);
      }

    } catch (error) {
      this.logger.error('Failed to ensure MinIO bucket exists', error?.message);
    }
  }

  /**
   * Upload a buffer to MinIO and return the object key.
   */
  async upload(
    buffer: Buffer,
    objectKey: string,
    mimeType: string,
  ): Promise<string> {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return objectKey;
  }

  /**
   * Generate a presigned GET URL valid for 7 days (read/download).
   * Uses presignClient so the signature matches the browser's Host header.
   */
  async getPresignedUrl(objectKey: string, expirySeconds = 60 * 60 * 24 * 7): Promise<string> {
    return this.presignClient.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  /**
   * Generate a presigned PUT URL so the client can upload directly to MinIO.
   * Uses presignClient so the signature matches the browser's Host header.
   */
  async getPresignedPutUrl(objectKey: string, expirySeconds = 60 * 15): Promise<string> {
    return this.presignClient.presignedPutObject(this.bucket, objectKey, expirySeconds);
  }

  /**
   * Download an object and return its buffer.
   */
  async getBuffer(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Delete an object from MinIO.
   */
  async delete(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }
}
