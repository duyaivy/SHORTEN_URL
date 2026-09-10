import { Injectable } from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

@Injectable()
export class DeleteUrlsUseCase {
  constructor(private readonly shortUrlRepository: ShortUrlRepository) {}

  async execute(ids: string[], userId: string): Promise<void> {
    await this.shortUrlRepository.deleteByIdsAndOwner(ids, userId);
  }
}
