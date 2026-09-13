import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../../shared/services/redis/redis.service';

/** Redis key prefix for pending click counters */
export const VIEWS_KEY_PREFIX = 'views:';

/**
 * Analytics Producer (Batch mode)
 *
 * Instead of pushing one BullMQ job per click, this simply does an atomic
 * Redis INCR on "views:{alias}". A scheduler (AnalyticsFlushScheduler)
 * periodically reads all pending counters and flushes them to MongoDB in bulk.
 *
 * Advantages over per-job processing:
 * - O(1) operation per redirect — Redis INCR is ~0.1ms vs 5-20ms DB write
 * - N clicks = 1 DB write per flush interval (instead of N writes)
 * - Naturally deduplicates rapid clicks on the same alias
 */
@Injectable()
export class AnalyticsProducer {
  private readonly logger = new Logger(AnalyticsProducer.name);

  constructor(private readonly redisService: RedisService) { }

  /**
   * Record a click for the given alias.
   * Atomically increments a Redis counter "views:{alias}".
   * The flush scheduler will later batch-write to DB.
   */
  async pushClickEvent(alias: string): Promise<void> {
    try {
      await this.redisService.incr(`${VIEWS_KEY_PREFIX}${alias}`);
    } catch (err: unknown) {
      this.logger.warn(
        `Failed to record click for alias "${alias}": ${(err as Error).message}`,
      );
    }
  }
}
