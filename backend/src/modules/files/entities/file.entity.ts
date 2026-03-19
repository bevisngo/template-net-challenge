import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export enum FileStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('files')
export class UploadedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ length: 500 })
  minioKey: string;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PROCESSING })
  status: FileStatus;

  // Gemini Files API reference — set after successful indexing
  @Column({ nullable: true, length: 500 })
  geminiFileUri: string;

  @Column({ nullable: true, length: 255 })
  geminiFileName: string;

  // When the file was uploaded to Gemini — used to check 48h TTL expiry
  @Column({ nullable: true, type: 'datetime' })
  geminiUploadedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
