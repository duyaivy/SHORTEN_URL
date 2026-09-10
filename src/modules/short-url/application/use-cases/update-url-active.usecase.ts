import { Injectable } from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

export interface UrlActiveItem {
  _id: string;
  is_active: boolean;
}

@Injectable()
export class UpdateUrlActiveUseCase {
  constructor(private readonly shortUrlRepository: ShortUrlRepository) {}

  async execute(urls: UrlActiveItem[], userId: string): Promise<void> {
    await this.shortUrlRepository.updateManyActive(
      urls.map((u) => ({ id: u._id, is_active: u.is_active })),
      userId,
    );
  }
}
