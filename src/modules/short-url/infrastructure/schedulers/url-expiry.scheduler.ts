import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../../../shared/services/redis.service';
import { makeUrlCacheKey } from '../../../../shared/types/cached-short-url.type';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

/**
 * URL Expiry Scheduler
 *
 * Runs every day at midnight (00:00 server time).
 * Deletes all ShortUrl records whose `exp` field is set and has passed,
 * then invalidates their Redis cache entries.
 *
 * This affects anonymous short links (exp = created_at + 14 days).
 * Authenticated user links have exp = null and are never auto-deleted.
 */
@Injectable()
export class UrlExpiryScheduler {
  private readonly logger = new Logger(UrlExpiryScheduler.name);

  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly redisService: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteExpiredUrls(): Promise<void> {
    this.logger.log('Running URL expiry cleanup...');

    try {
      // 1. Delete expired records from DB — returns aliases of deleted records
      const deletedAliases = await this.shortUrlRepository.deleteExpiredUrls();

      if (deletedAliases.length === 0) {
        this.logger.log('No expired URLs found');
        return;
      }

      // 2. Invalidate Redis cache for all deleted aliases
      const cacheKeys = deletedAliases.map((alias) => makeUrlCacheKey(alias));
      await this.redisService.del(...cacheKeys);

      this.logger.log(
        `Deleted ${deletedAliases.length} expired URL(s) and cleared their cache`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `URL expiry cleanup failed: ${(err as Error).message}`,
      );
    }
  }
}
