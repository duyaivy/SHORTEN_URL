import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../../../shared/services/redis/redis.service';
import { makeUrlCacheKey } from '../../../../shared/types/cached-short-url.type';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { VIEWS_KEY_PREFIX } from './analytics.producer';

/**
 * Analytics Flush Scheduler
 *
 * Runs every 30 seconds and batch-writes all accumulated click counts to MongoDB.
 *
 * Flow:
 *  1. SCAN Redis for all "views:*" keys
 *  2. For each key: atomically GET + DEL the counter (pipeline)
 *  3. Bulk update MongoDB in a single transaction ($inc by collected count)
 *  4. Invalidate the URL cache so next read reflects updated views
 *
 * Result: N clicks per 30s = 1 MongoDB transaction (vs N writes with per-job approach)
 */
@Injectable()
export class AnalyticsFlushScheduler {
  private readonly logger = new Logger(AnalyticsFlushScheduler.name);
  private isFlushing = false;

  constructor(
    private readonly redisService: RedisService,
    private readonly shortUrlRepository: ShortUrlRepository,
  ) { }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async flushViews(): Promise<void> {
    // Guard against overlapping runs (e.g. if flush takes > 30s)
    if (this.isFlushing) {
      this.logger.warn('Previous flush still running — skipping this cycle');
      return;
    }

    this.isFlushing = true;

    try {
      // 1. Find all pending click counter keys
      const keys = await this.redisService.scanKeys(`${VIEWS_KEY_PREFIX}*`);
      if (keys.length === 0) return;

      // 2. Atomically drain each counter (GET + DEL in a single pipeline)
      const increments: { alias: string; count: number }[] = [];

      await Promise.all(
        keys.map(async (key) => {
          const count = await this.redisService.getAndDelete(key);
          if (count > 0) {
            const alias = key.slice(VIEWS_KEY_PREFIX.length);
            increments.push({ alias, count });
          }
        }),
      );

      if (increments.length === 0) return;

      // 3. Bulk update MongoDB — 1 transaction for all aliases
      await this.shortUrlRepository.bulkIncrementViews(increments);

      // 4. Invalidate URL cache so next read picks up the fresh views count
      const cacheKeys = increments.map(({ alias }) => makeUrlCacheKey(alias));
      await this.redisService.del(...cacheKeys);

      this.logger.log(
        `Flushed ${increments.reduce((s, i) => s + i.count, 0)} clicks across ${increments.length} URLs`,
      );
    } catch (err: unknown) {
      this.logger.error(`Analytics flush failed: ${(err as Error).message}`);
    } finally {
      this.isFlushing = false;
    }
  }
}
