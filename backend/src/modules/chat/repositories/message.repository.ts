import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Message } from '../entities/message.entity';

@Injectable()
export class MessageRepository extends BaseRepository<Message> {
  constructor(
    @InjectRepository(Message)
    repo: Repository<Message>,
  ) {
    super(repo);
  }

  findRecent(conversationId: string, limit: number): Promise<Message[]> {
    return this.repo.find({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findPaginated(
    conversationId: string,
    before?: string,
    limit = 10,
  ): Promise<{ data: Message[]; hasMore: boolean }> {
    const qb = this.repo
      .createQueryBuilder('msg')
      .where('msg.conversationId = :conversationId', { conversationId })
      .orderBy('msg.createdAt', 'DESC')
      .take(limit + 1);

    if (before) {
      const cursor = await this.repo.findOne({ where: { id: before } });
      if (cursor) {
        qb.andWhere('msg.createdAt < :cursorDate', { cursorDate: cursor.createdAt });
      }
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const data = rows.slice(0, limit).reverse();

    return { data, hasMore };
  }
}
