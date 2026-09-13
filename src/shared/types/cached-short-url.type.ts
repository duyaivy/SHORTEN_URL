import { SeoData } from '../../modules/short-url/domain/entities/short-url.entity';

/**
 * Shape of a ShortUrl entry stored in Redis cache.
 * Dates are serialized as ISO strings since JSON.stringify/parse does not preserve Date objects.
 */
export interface CachedShortUrl {
  id: string;
  alias: string;
  url: string;
  /** Hashed password (used only to determine if URL is password-protected, never displayed) */
  password: string | null;
  owner_id: string | null;
  is_active: boolean;
  views: number;
  seo_data: SeoData | null;
  /** ISO 8601 string or null */
  exp: string | null;
}

/**
 * Consistent Redis cache key for a short URL alias.
 * Format: url:{alias}
 */
export const makeUrlCacheKey = (alias: string): string => `url:${alias}`;

/** Default TTL (seconds) for a cached URL entry — 1 hour. */
export const URL_CACHE_TTL = 3600;

/** TTL (seconds) for null-sentinel cache entries — prevents Cache Penetration. */
export const URL_NULL_CACHE_TTL = 60;
