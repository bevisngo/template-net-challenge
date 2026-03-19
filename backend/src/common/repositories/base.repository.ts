import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';

export abstract class BaseRepository<T extends { id: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  findById(id: string): Promise<T | null> {
    return this.repo.findOne({ where: { id } as FindOptionsWhere<T> });
  }

  findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repo.find(options);
  }

  create(data: Partial<T>): T {
    return this.repo.create(data as T);
  }

  save(entity: T): Promise<T> {
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    await this.repo.update(id, data as any);
  }

  remove(entity: T): Promise<T> {
    return this.repo.remove(entity);
  }
}
