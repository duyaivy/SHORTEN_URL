import { Injectable } from '@nestjs/common';
import { makeUrlCacheKey } from '../../../../shared/types/cached-short-url.type';
import { RedisService } from '../../../../shared/services/redis.service';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

@Injectable()
export class DeleteUrlsUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly redisService: RedisService,
  ) {}

  async execute(ids: string[], userId: string): Promise<void> {
    // ── Fetch aliases for cache invalidation BEFORE deleting ──
    // We must do this before deletion because after deleteMany the records are gone.
    const urlsToDelete = await this.shortUrlRepository.findManyByIds(ids);
    const cacheKeys = urlsToDelete.map((u) => makeUrlCacheKey(u.alias));

    // ── Delete from DB ────────────────────────────────────────
    await this.shortUrlRepository.deleteByIdsAndOwner(ids, userId);

    // ── Invalidate cache ──────────────────────────────────────
    if (cacheKeys.length > 0) {
      await this.redisService.del(...cacheKeys);
    }
  }
}
