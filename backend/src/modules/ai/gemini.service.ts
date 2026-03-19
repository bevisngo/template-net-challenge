import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export function isGeminiQuotaError(error: unknown): boolean {
  const msg: string = (error as any)?.message ?? '';
  const status: string = (error as any)?.status ?? '';
  return (
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('Too Many Requests')
  );
}
import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FileContext {
  geminiFileUri: string;
  mimeType: string;
}

export interface GeminiUploadResult {
  uri: string;
  name: string;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model = 'gemini-2.5-flash';
  private readonly systemInstruction =
    'You are a helpful AI assistant for Template.net. Answer clearly and concisely.';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  // ─── File Indexing ────────────────────────────────────────────────────────────

  /**
   * Upload a file buffer to Gemini Files API for later use in chat.
   * Gemini stores the file on its side and returns a URI to reference it.
   */
  async uploadFile(
    buffer: Buffer,
    mimeType: string,
    displayName: string,
  ): Promise<GeminiUploadResult> {
    try {
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });

      const uploaded = await this.client.files.upload({
        file: blob,
        config: { displayName, mimeType },
      });

      if (!uploaded.uri || !uploaded.name) {
        throw new Error('Gemini file upload returned incomplete response');
      }

      this.logger.log(`File indexed in Gemini: ${uploaded.name}`);
      return { uri: uploaded.uri, name: uploaded.name };
    } catch (error) {
      this.logger.error('Gemini file upload error', error?.message ?? error);
      throw error;
    }
  }

  /**
   * Delete a file from Gemini Files API.
   */
  async deleteFile(geminiFileName: string): Promise<void> {
    try {
      await this.client.files.delete({ name: geminiFileName });
    } catch (error) {
      this.logger.warn(`Failed to delete Gemini file ${geminiFileName}`, error?.message);
    }
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────────

  private logPayload(method: string, history: ChatMessage[], prompt: string, files?: FileContext[]) {
    const payload = {
      model: this.model,
      systemInstruction: this.systemInstruction,
      history: history.map((m) => ({ role: m.role, text: m.text })),
      prompt,
      ...(files?.length ? { files: files.map((f) => ({ uri: f.geminiFileUri, mimeType: f.mimeType })) } : {}),
    };
    this.logger.log(`[${method}] payload:\n${JSON.stringify(payload, null, 2)}`);
  }

  /**
   * Multi-turn text-only chat.
   */
  async chat(history: ChatMessage[], prompt: string): Promise<string> {
    try {
      const session = this.client.chats.create({
        model: this.model,
        config: { systemInstruction: this.systemInstruction },
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      this.logPayload('chat', history, prompt);
      const response = await session.sendMessage({ message: prompt });
      return response.text ?? 'Sorry, I could not generate a response.';
    } catch (error) {
      this.logger.error('Gemini chat error', error?.message ?? error);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }

  /**
   * Streaming multi-turn text-only chat — yields text chunks as they arrive.
   */
  async *chatStream(history: ChatMessage[], prompt: string): AsyncIterable<string> {
    try {
      const session = this.client.chats.create({
        model: this.model,
        config: { systemInstruction: this.systemInstruction },
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      this.logPayload('chatStream', history, prompt);
      const stream = await session.sendMessageStream({ message: prompt });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield text;
      }
    } catch (error) {
      this.logger.error('Gemini chatStream error', error?.message ?? error);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }

  /**
   * Multi-turn chat with file context.
   * Files are included as fileData parts alongside the text prompt.
   * The model can read and reason about all provided files.
   */
  async chatWithFiles(
    history: ChatMessage[],
    prompt: string,
    files: FileContext[],
  ): Promise<string> {
    try {
      const session = this.client.chats.create({
        model: this.model,
        config: { systemInstruction: this.systemInstruction },
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      // Build the message parts: attach each file then the text prompt
      const parts: any[] = [
        ...files.map((f) => ({
          fileData: { fileUri: f.geminiFileUri, mimeType: f.mimeType },
        })),
        { text: prompt },
      ];

      this.logPayload('chatWithFiles', history, prompt, files);
      const response = await session.sendMessage({ message: parts });
      return response.text ?? 'Sorry, I could not generate a response.';
    } catch (error) {
      this.logger.error('Gemini chatWithFiles error', error?.message ?? error);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }

  /**
   * Streaming multi-turn chat with file context — yields text chunks as they arrive.
   */
  async *chatWithFilesStream(
    history: ChatMessage[],
    prompt: string,
    files: FileContext[],
  ): AsyncIterable<string> {
    try {
      const session = this.client.chats.create({
        model: this.model,
        config: { systemInstruction: this.systemInstruction },
        history: history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.text }],
        })),
      });

      const parts: any[] = [
        ...files.map((f) => ({
          fileData: { fileUri: f.geminiFileUri, mimeType: f.mimeType },
        })),
        { text: prompt },
      ];

      this.logPayload('chatWithFilesStream', history, prompt, files);
      const stream = await session.sendMessageStream({ message: parts });
      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) yield text;
      }
    } catch (error) {
      this.logger.error('Gemini chatWithFilesStream error', error?.message ?? error);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }

  /**
   * Embed a text string into a 768-dimension vector using gemini-embedding-001.
   * Used by the RAG pipeline to index chunks and query vectors.
   */
  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.client.models.embedContent({
        model: 'gemini-embedding-001',
        contents: text,
        config: { outputDimensionality: 768 },
      });
      return result.embeddings[0].values;
    } catch (error) {
      this.logger.error('Gemini embed error', error?.message ?? error);
      throw new ServiceUnavailableException('Embedding service is temporarily unavailable.');
    }
  }

  /**
   * Generate a short, descriptive conversation title from the user's first message.
   * Falls back to the first 80 chars of the message if Gemini fails.
   */
  async generateTitle(userMessage: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: `Generate a short, descriptive conversation title (max 60 characters, no quotes, no punctuation at end) for a chat that starts with this user message:\n\n${userMessage}`,
      });
      const title = (response.text ?? '').trim().replace(/^["']|["']$/g, '');
      return title.slice(0, 80) || userMessage.slice(0, 80);
    } catch (error) {
      this.logger.warn('Title generation failed, using message fallback', error?.message);
      return userMessage.slice(0, 80);
    }
  }

  /**
   * Single-turn generation without history.
   */
  async generate(prompt: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: prompt,
        config: { systemInstruction: this.systemInstruction },
      });
      return response.text ?? 'Sorry, I could not generate a response.';
    } catch (error) {
      this.logger.error('Gemini generateContent error', error?.message ?? error);
      throw new ServiceUnavailableException('AI service is temporarily unavailable.');
    }
  }
}
