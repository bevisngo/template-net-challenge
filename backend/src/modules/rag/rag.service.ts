import { Injectable, Logger } from "@nestjs/common";
import { GeminiService } from "../ai/gemini.service";
import { QdrantService } from "../storage/qdrant.service";
import { UploadedFile } from "../files/entities/file.entity";
import { PDFParse } from "pdf-parse";

// ~500 tokens per chunk, ~100 token overlap (approximated in words)
const CHUNK_SIZE_WORDS = 400;
const CHUNK_OVERLAP_WORDS = 80;
const RAG_TOP_K = 5;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private geminiService: GeminiService,
    private qdrantService: QdrantService,
  ) {}

  /**
   * Index a file into Qdrant:
   *  1. Extract plain text from the buffer
   *  2. Split into overlapping chunks
   *  3. Embed each chunk with Gemini text-embedding-004
   *  4. Upsert all vectors into Qdrant
   */
  async indexFile(file: UploadedFile, buffer: Buffer): Promise<void> {
    this.logger.log(
      `[indexFile] START — fileId=${file.id} "${file.originalName}" mimeType=${file.mimeType}`,
    );
    const start = Date.now();

    const text = await this.extractText(buffer, file.mimeType);
    if (!text.trim()) {
      this.logger.warn(
        `[indexFile] no text extracted from file ${file.id} (${file.mimeType}) — skipping RAG index`,
      );
      return;
    }
    this.logger.log(`[indexFile] text extracted — ${text.length} chars`);

    const chunks = this.chunkText(text);
    this.logger.log(
      `[indexFile] chunked into ${chunks.length} chunk(s) — embedding each...`,
    );

    // Embed all chunks (sequential to avoid rate limiting)
    const points = [];
    for (let i = 0; i < chunks.length; i++) {
      const vector = await this.geminiService.embed(chunks[i]);
      points.push({
        fileId: file.id,
        userId: file.userId,
        chunkIndex: i,
        text: chunks[i],
        vector,
      });
      this.logger.log(`[indexFile] embedded chunk ${i + 1}/${chunks.length}`);
    }

    await this.qdrantService.upsert(points);
    this.logger.log(
      `[indexFile] DONE — fileId=${file.id} chunks=${points.length} took=${Date.now() - start}ms`,
    );
  }

  /**
   * Retrieve the most relevant chunks from Qdrant for the given prompt and file IDs.
   * Returns a single joined string ready to inject into the Gemini prompt.
   */
  async retrieveContext(prompt: string, fileIds: string[]): Promise<string> {
    if (!fileIds.length) return "";

    const queryVector = await this.geminiService.embed(prompt);
    const chunks = await this.qdrantService.search(
      queryVector,
      RAG_TOP_K,
      fileIds,
    );

    if (!chunks.length) return "";

    this.logger.log(
      `Retrieved ${chunks.length} RAG chunk(s) for ${fileIds.length} file(s)`,
    );
    return chunks.join("\n\n---\n\n");
  }

  /**
   * Remove all Qdrant vectors for a file (called when the file is deleted).
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.qdrantService.deleteByFileId(fileId);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      if (mimeType === "application/pdf") {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        return result.text;
      }

      // text/plain, text/csv, text/markdown, application/json
      if (mimeType.startsWith("text/") || mimeType === "application/json") {
        return buffer.toString("utf-8");
      }

      // images (jpeg, png, gif, webp) — no text to extract; Gemini Files API handles these
      this.logger.warn(
        `RAG: unsupported mimeType for text extraction: ${mimeType}`,
      );
      return "";
    } catch (error) {
      this.logger.error(
        `Text extraction failed for mimeType=${mimeType}`,
        error?.message,
      );
      return "";
    }
  }

  /**
   * Split text into overlapping word-based chunks.
   * chunkSize ≈ 400 words (~500 tokens), overlap ≈ 80 words (~100 tokens).
   */
  private chunkText(text: string): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];

    for (
      let i = 0;
      i < words.length;
      i += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS
    ) {
      const chunk = words.slice(i, i + CHUNK_SIZE_WORDS).join(" ");
      if (chunk) chunks.push(chunk);
      if (i + CHUNK_SIZE_WORDS >= words.length) break;
    }

    return chunks;
  }
}
