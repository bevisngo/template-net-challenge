import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Conversation } from './entities/conversation.entity';
import { Message, MessageRole } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { GeminiService, FileContext, isGeminiQuotaError } from '../ai/gemini.service';
import { FilesService } from '../files/files.service';
import { RagService } from '../rag/rag.service';
import { FileStatus, UploadedFile } from '../files/entities/file.entity';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

// Gemini Files API TTL is 48h; we treat files as expired at 47h to be safe
const GEMINI_TTL_HOURS = 47;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private geminiService: GeminiService,
    private filesService: FilesService,
    private ragService: RagService,
  ) {}

  // ─── Conversations ───────────────────────────────────────────────────────────

  async createConversation(userId: string, dto: CreateConversationDto): Promise<Conversation> {
    let title = dto.title || 'New Conversation';
    if (!dto.title && dto.firstMessage) {
      title = await this.geminiService.generateTitle(dto.firstMessage);
    }
    const conversation = this.conversationRepository.create({ userId, title });
    return this.conversationRepository.save(conversation);
  }

  getConversations(userId: string): Promise<Conversation[]> {
    return this.conversationRepository.findByUser(userId);
  }

  async getConversation(id: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findByIdWithMessages(id);

    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== userId) throw new ForbiddenException();

    return conversation;
  }

  async updateConversation(
    id: string,
    userId: string,
    dto: UpdateConversationDto,
  ): Promise<Conversation> {
    const conversation = await this.getConversation(id, userId);
    conversation.title = dto.title;
    return this.conversationRepository.save(conversation);
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const conversation = await this.getConversation(id, userId);
    await this.conversationRepository.remove(conversation);
  }

  // ─── Messages ─────────────────────────────────────────────────────────────────

  async getMessages(
    conversationId: string,
    userId: string,
    before?: string,
    limit = 10,
  ): Promise<{ data: Message[]; hasMore: boolean }> {
    await this.getConversation(conversationId, userId);
    return this.messageRepository.findPaginated(conversationId, before, limit);
  }

  async sendMessage(
    userId: string,
    dto: SendMessageDto,
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    this.logger.log(
      `[sendMessage] START — userId=${userId} conversationId=${dto.conversationId} fileIds=${JSON.stringify(dto.fileIds ?? [])}`,
    );

    await this.getConversation(dto.conversationId, userId);

    const attachedFiles = await this.resolveFiles(dto.fileIds ?? [], userId);
    this.logger.log(`[sendMessage] files resolved — ${attachedFiles.length} file(s) ready`);

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: dto.conversationId,
        role: MessageRole.USER,
        content: dto.content,
        fileIds: dto.fileIds?.length ? dto.fileIds : null,
      }),
    );
    this.logger.log(`[sendMessage] user message saved — id=${userMessage.id}`);

    const history = await this.buildGeminiHistory(dto.conversationId);
    const { geminiFiles, augmentedPrompt } = await this.buildHybridContext(
      attachedFiles,
      dto.content ?? '',
    );

    this.logger.log(
      `[sendMessage] calling Gemini — history=${history.length} geminiFiles=${geminiFiles.length} ragFallback=${augmentedPrompt !== (dto.content ?? '')}`,
    );

    const start = Date.now();
    const aiText =
      geminiFiles.length > 0
        ? await this.geminiService.chatWithFiles(history, augmentedPrompt, geminiFiles)
        : await this.geminiService.chat(history, augmentedPrompt);

    this.logger.log(`[sendMessage] Gemini responded in ${Date.now() - start}ms`);

    const aiMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: dto.conversationId,
        role: MessageRole.ASSISTANT,
        content: aiText,
      }),
    );
    this.logger.log(`[sendMessage] DONE — total=${Date.now() - start}ms`);

    return { userMessage, aiMessage };
  }

  async *sendMessageStream(
    userId: string,
    dto: SendMessageDto,
  ): AsyncGenerator<{ type: string; data: unknown }> {
    await this.getConversation(dto.conversationId, userId);

    const attachedFiles = await this.resolveFiles(dto.fileIds ?? [], userId);

    const userMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: dto.conversationId,
        role: MessageRole.USER,
        content: dto.content,
        fileIds: dto.fileIds?.length ? dto.fileIds : null,
      }),
    );
    yield { type: 'userMessage', data: userMessage };

    const history = await this.buildGeminiHistory(dto.conversationId);
    const { geminiFiles, augmentedPrompt } = await this.buildHybridContext(
      attachedFiles,
      dto.content ?? '',
    );

    const stream =
      geminiFiles.length > 0
        ? this.geminiService.chatWithFilesStream(history, augmentedPrompt, geminiFiles)
        : this.geminiService.chatStream(history, augmentedPrompt);

    const QUOTA_MESSAGE =
      "You've reached the Gemini API free-tier limit. Please check your plan and billing details at https://ai.google.dev/gemini-api/docs/rate-limits, then try again later.";

    let fullText = '';
    try {
      for await (const chunk of stream) {
        fullText += chunk;
        yield { type: 'chunk', data: chunk };
      }
    } catch (err) {
      if (isGeminiQuotaError(err)) {
        this.logger.warn(`[sendMessageStream] Gemini quota exceeded — streaming fallback message`);
        fullText = QUOTA_MESSAGE;
        yield { type: 'chunk', data: QUOTA_MESSAGE };
      } else {
        throw err;
      }
    }

    const aiMessage = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: dto.conversationId,
        role: MessageRole.ASSISTANT,
        content: fullText || 'Sorry, I could not generate a response.',
      }),
    );
    yield { type: 'aiMessage', data: aiMessage };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private async buildGeminiHistory(conversationId: string) {
    const recent = await this.messageRepository.findRecent(conversationId, 20);
    recent.reverse();
    return recent.slice(0, -1).map((m) => ({
      role: m.role === MessageRole.USER ? ('user' as const) : ('model' as const),
      text: m.content,
    }));
  }

  private async resolveFiles(fileIds: string[], userId: string): Promise<UploadedFile[]> {
    if (!fileIds.length) return [];

    const files = await this.filesService.getFilesByIds(fileIds, userId);

    const notReady = files.filter((f) => f.status !== FileStatus.READY);
    if (notReady.length) {
      throw new BadRequestException(
        `File(s) not ready yet: ${notReady.map((f) => f.originalName).join(', ')}. Wait for indexing to complete.`,
      );
    }

    return files;
  }

  /**
   * Split attached files into two groups:
   *  - geminiFiles: still within 47h TTL → pass by URI to Gemini Files API
   *  - ragFileIds:  expired or no Gemini URI → retrieve chunks from Qdrant
   *
   * Returns the Gemini file contexts and an augmented prompt that includes
   * RAG chunk context for any expired files.
   */
  private async buildHybridContext(
    files: UploadedFile[],
    userPrompt: string,
  ): Promise<{ geminiFiles: FileContext[]; augmentedPrompt: string }> {
    const geminiFiles: FileContext[] = [];
    const ragFileIds: string[] = [];

    for (const file of files) {
      if (this.isGeminiValid(file)) {
        geminiFiles.push({ geminiFileUri: file.geminiFileUri, mimeType: file.mimeType });
      } else {
        this.logger.log(`File ${file.id} Gemini URI expired or missing — falling back to RAG`);
        ragFileIds.push(file.id);
      }
    }

    let augmentedPrompt = userPrompt;

    if (ragFileIds.length > 0) {
      const context = await this.ragService.retrieveContext(userPrompt, ragFileIds);
      if (context) {
        augmentedPrompt =
          `Relevant context retrieved from file(s):\n\n${context}\n\n---\n\nUser question: ${userPrompt}`;
      }
    }

    return { geminiFiles, augmentedPrompt };
  }

  /**
   * Returns true if the file's Gemini URI is still within the 47-hour safe window.
   */
  private isGeminiValid(file: UploadedFile): boolean {
    if (!file.geminiFileUri || !file.geminiUploadedAt) return false;
    const ageHours = (Date.now() - new Date(file.geminiUploadedAt).getTime()) / 3_600_000;
    return ageHours < GEMINI_TTL_HOURS;
  }
}
