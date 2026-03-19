import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsString, IsNumber, IsPositive } from 'class-validator';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class InitiateUploadDto {
  @IsString()
  filename: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  @IsPositive()
  size: number;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  /**
   * POST /api/files/upload
   * Multipart upload — stores in MinIO then indexes to Gemini.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep in memory; we stream to MinIO
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 },
    }),
  )
  async upload(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type not supported. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    return this.filesService.upload(
      req.user.id,
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size,
    );
  }

  /**
   * POST /api/files/presigned-upload
   * Body: { filename, mimeType, size }
   * Returns: { fileId, uploadUrl }
   *
   * The client should:
   *   1. Call this endpoint to get a presigned PUT URL
   *   2. PUT the binary directly to `uploadUrl` (with Content-Type header)
   *   3. Call POST /api/files/:fileId/confirm to trigger Gemini indexing
   */
  @Post('presigned-upload')
  async initiateUpload(@Request() req, @Body() body: InitiateUploadDto) {
    const { filename, mimeType, size } = body;

    if (!filename || !mimeType || !size) {
      throw new BadRequestException('filename, mimeType, and size are required');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `File type not supported. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024;
    if (size > maxSize) {
      throw new BadRequestException(`File too large. Max size: ${maxSize} bytes`);
    }

    return this.filesService.initiateUpload(req.user.id, filename, mimeType, size);
  }

  /**
   * POST /api/files/:id/confirm
   * Call after the client has successfully PUT the file to MinIO.
   * Triggers async Gemini indexing and returns the updated file record.
   */
  @Post(':id/confirm')
  confirmUpload(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.confirmUpload(id, req.user.id);
  }

  /** GET /api/files — list all files for the authenticated user */
  @Get()
  getUserFiles(@Request() req) {
    return this.filesService.getUserFiles(req.user.id);
  }

  /** GET /api/files/:id — get file metadata */
  @Get(':id')
  getFile(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.getFile(id, req.user.id);
  }

  /** GET /api/files/:id/url — get a presigned download URL */
  @Get(':id/url')
  getPresignedUrl(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.getPresignedUrl(id, req.user.id);
  }

  /** DELETE /api/files/:id — remove from MinIO + Gemini + DB */
  @Delete(':id')
  delete(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.delete(id, req.user.id);
  }
}
