import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

export interface ChunkPoint {
  fileId: string;
  userId: string;
  chunkIndex: number;
  text: string;
  vector: number[];
}

const COLLECTION = 'file_chunks';
const VECTOR_SIZE = 768; // gemini-embedding-001 with outputDimensionality: 768

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private readonly client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      host: process.env.QDRANT_HOST || 'localhost',
      port: parseInt(process.env.QDRANT_PORT) || 6333,
    });
  }

  async onModuleInit() {
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION);

      if (!exists) {
        await this.client.createCollection(COLLECTION, {
          vectors: { size: VECTOR_SIZE, distance: 'Cosine' },
        });
        this.logger.log(`Qdrant collection "${COLLECTION}" created`);
      } else {
        this.logger.log(`Qdrant collection "${COLLECTION}" already exists`);
      }
    } catch (error) {
      this.logger.error('Failed to ensure Qdrant collection', error?.message);
    }
  }

  /**
   * Store a batch of chunk vectors with their metadata payload.
   */
  async upsert(points: ChunkPoint[]): Promise<void> {
    await this.client.upsert(COLLECTION, {
      points: points.map((p) => ({
        id: uuidv4(),
        vector: p.vector,
        payload: {
          fileId: p.fileId,
          userId: p.userId,
          chunkIndex: p.chunkIndex,
          text: p.text,
        },
      })),
    });
    this.logger.log(`Upserted ${points.length} chunks for fileId=${points[0]?.fileId}`);
  }

  /**
   * Find the top-K most semantically similar chunks to the query vector,
   * scoped to the given file IDs.
   */
  async search(queryVector: number[], topK: number, fileIds: string[]): Promise<string[]> {
    const results = await this.client.search(COLLECTION, {
      vector: queryVector,
      limit: topK,
      filter: {
        must: [
          {
            key: 'fileId',
            match: { any: fileIds },
          },
        ],
      },
      with_payload: true,
    });

    return results.map((r) => r.payload?.text as string).filter(Boolean);
  }

  /**
   * Delete all chunk vectors belonging to a file (called on file delete).
   */
  async deleteByFileId(fileId: string): Promise<void> {
    try {
      await this.client.delete(COLLECTION, {
        filter: {
          must: [{ key: 'fileId', match: { value: fileId } }],
        },
      });
      this.logger.log(`Deleted Qdrant chunks for fileId=${fileId}`);
    } catch (error) {
      this.logger.warn(`Failed to delete Qdrant chunks for fileId=${fileId}`, error?.message);
    }
  }
}
