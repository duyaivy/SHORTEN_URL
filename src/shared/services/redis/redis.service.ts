import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { EnvironmentVariables } from '../../config/env.validation';

/** Sentinel string stored in Redis when a key is known to not exist (null cache). */
const NULL_SENTINEL = '__NULL__';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private _isReady = false;

  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) { }

  onModuleInit(): void {
    let url =
      this.configService.get('REDIS_URL', { infer: true }) ||
      'redis://localhost:6379';

    // Upstash Redis requires TLS (rediss://)
    if (url.includes('upstash.io') && url.startsWith('redis://')) {
      url = url.replace('redis://', 'rediss://');
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: null,
      connectTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 1000, 5000),
    });

    this.client.on('ready', () => {
      this._isReady = true;
      this.logger.log('Redis connected & ready');
    });

    this.client.on('error', (err: Error) => {
      this._isReady = false;
      this.logger.warn(`Redis error: ${err.message} — falling back to DB`);
    });

    this.client.on('close', () => {
      this._isReady = false;
    });

    this.client.connect().catch((err: Error) => {
      this.logger.warn(
        `Redis initial connection failed: ${err.message} — continuing without cache`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  /**
   * Get a cached value by key.
   *
   * Returns:
   * - `undefined`  → cache miss (key not in Redis, or Redis is down)
   * - `null`       → null sentinel — the caller should treat this as "not found"
   * - `T`          → cache hit
   */
  async get<T>(key: string): Promise<T | null | undefined> {
    if (!this._isReady) return undefined;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return undefined; // miss
      if (raw === NULL_SENTINEL) return null; // null sentinel
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      this.logger.warn(
        `Redis GET "${key}" failed: ${(err as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Set a value in Redis.
   * @param ttlSeconds Optional TTL in seconds. Omit for no expiry.
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this._isReady) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Redis SET "${key}" failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Cache a null sentinel for a key.
   * Used to prevent Cache Penetration: repeated lookups for non-existent URLs won't hit DB.
   * @param ttlSeconds Default 60 seconds.
   */
  async setNull(key: string, ttlSeconds = 60): Promise<void> {
    if (!this._isReady) return;
    try {
      await this.client.setex(key, ttlSeconds, NULL_SENTINEL);
    } catch (err: unknown) {
      this.logger.warn(
        `Redis SETNULL "${key}" failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Delete one or more keys from Redis.
   * Used for cache invalidation after mutations.
   */
  async del(...keys: string[]): Promise<void> {
    if (!this._isReady || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err: unknown) {
      this.logger.warn(`Redis DEL failed: ${(err as Error).message}`);
    }
  }

  /**
   * Atomically increment a numeric counter by 1.
   * Used by the analytics producer to record clicks without hitting DB.
   * @returns The new value after increment, or null if Redis is down.
   */
  async incr(key: string): Promise<number | null> {
    if (!this._isReady) return null;
    try {
      return await this.client.incr(key);
    } catch (err: unknown) {
      this.logger.warn(`Redis INCR "${key}" failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Scan Redis for keys matching a pattern.
   * Uses SCAN (non-blocking) instead of KEYS (blocking).
   * @returns Array of matching key strings.
   */
  async scanKeys(pattern: string): Promise<string[]> {
    if (!this._isReady) return [];
    try {
      const keys: string[] = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...batch);
      } while (cursor !== '0');
      return keys;
    } catch (err: unknown) {
      this.logger.warn(
        `Redis SCAN "${pattern}" failed: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Get the integer value of a key, then delete it atomically using a pipeline.
   * Used by the flush scheduler to drain click counters safely.
   * @returns The value before deletion, or 0 if key doesn't exist.
   */
  async getAndDelete(key: string): Promise<number> {
    if (!this._isReady) return 0;
    try {
      const pipeline = this.client.pipeline();
      pipeline.get(key);
      pipeline.del(key);
      const results = await pipeline.exec();
      const value = results?.[0]?.[1];
      return typeof value === 'string' ? parseInt(value, 10) || 0 : 0;
    } catch (err: unknown) {
      this.logger.warn(
        `Redis getAndDelete "${key}" failed: ${(err as Error).message}`,
      );
      return 0;
    }
  }

  /** The underlying ioredis client — used by BullMQ connection factory. */
  get ioredis(): Redis {
    return this.client;
  }
}
