import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ─── Conversations ──────────────────────────────────────────────────────────

  @Post('conversations')
  createConversation(@Request() req, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(req.user.id, dto);
  }

  @Get('conversations')
  getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('conversations/:id')
  getConversation(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.getConversation(id, req.user.id);
  }

  @Patch('conversations/:id')
  updateConversation(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(id, req.user.id, dto);
  }

  @Delete('conversations/:id')
  deleteConversation(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.chatService.deleteConversation(id, req.user.id);
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  @Get('conversations/:id/messages')
  getMessages(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getMessages(id, req.user.id, before, limit ? parseInt(limit) : undefined);
  }

  @Post('messages')
  sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user.id, dto);
  }

  @Post('messages/stream')
  async sendMessageStream(
    @Request() req,
    @Body() dto: SendMessageDto,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.chatService.sendMessageStream(req.user.id, dto)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write(`data: [DONE]\n\n`);
    } catch (err) {
      res.write(`data: ${JSON.stringify({ type: 'error', data: err?.message ?? 'Stream error' })}\n\n`);
    } finally {
      res.end();
    }
  }

  // ─── File Upload ─────────────────────────────────────────────────────────────

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const unique = uuidv4();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
    }),
  )
  uploadFile(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return {
      fileUrl: `/uploads/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}
