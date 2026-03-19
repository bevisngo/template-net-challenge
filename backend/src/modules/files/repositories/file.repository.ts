import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { UploadedFile } from '../entities/file.entity';

@Injectable()
export class FileRepository extends BaseRepository<UploadedFile> {
  constructor(
    @InjectRepository(UploadedFile)
    repo: Repository<UploadedFile>,
  ) {
    super(repo);
  }

  findByUser(userId: string): Promise<UploadedFile[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findByIds(ids: string[]): Promise<UploadedFile[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.repo.find({ where: { id: In(ids) } });
  }
}
