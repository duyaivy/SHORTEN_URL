import { Injectable } from '@nestjs/common';
import { makeUrlCacheKey } from '../../../../shared/types/cached-short-url.type';
import { RedisService } from '../../../../shared/services/redis.service';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

export interface UrlActiveItem {
  _id: string;
  is_active: boolean;
}

@Injectable()
export class UpdateUrlActiveUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly redisService: RedisService,
  ) { }

  async execute(urls: UrlActiveItem[], userId: string): Promise<void> {
    const ids = urls.map((u) => u._id);
    const existingUrls = await this.shortUrlRepository.findManyByIds(ids);
    const cacheKeys = existingUrls.map((u) => makeUrlCacheKey(u.alias));

    await this.shortUrlRepository.updateManyActive(
      urls.map((u) => ({ id: u._id, is_active: u.is_active })),
      userId,
    );

    if (cacheKeys.length > 0) {
      await this.redisService.del(...cacheKeys);
    }
  }
}
