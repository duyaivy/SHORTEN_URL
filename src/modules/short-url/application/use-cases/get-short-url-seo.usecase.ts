import { Injectable } from '@nestjs/common';
import {
  CachedShortUrl,
  makeUrlCacheKey,
  URL_CACHE_TTL,
  URL_NULL_CACHE_TTL,
} from '../../../../shared/types/cached-short-url.type';
import { RedisService } from '../../../../shared/services/redis.service';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { SeoPort } from '../ports/seo.port';

/**
 * Dành cho Bot/Crawler:
 * - Cache-Aside: đọc SEO data từ Redis trước, fallback DB nếu miss
 * - KHÔNG tăng views (bot traffic không tính)
 * - Trả về HTML với meta tags để crawler index đúng
 */
@Injectable()
export class GetShortUrlSeoUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly seoPort: SeoPort,
    private readonly redisService: RedisService,
  ) {}

  async execute(alias: string): Promise<string> {
    const aliasText = encodeURIComponent(alias);
    const cacheKey = makeUrlCacheKey(aliasText);

    // ── 1. Cache lookup ───────────────────────────────────────
    let urlData: CachedShortUrl | null | undefined;

    const cached = await this.redisService.get<CachedShortUrl>(cacheKey);

    if (cached === null) {
      // Null sentinel — URL is known to not exist
      return this.seoPort.createNotFoundMetaHTML();
    }

    if (cached !== undefined) {
      urlData = cached;
    } else {
      // Cache miss — query DB
      const url = await this.shortUrlRepository.findByAlias(aliasText);

      if (!url || !url.is_active) {
        await this.redisService.setNull(cacheKey, URL_NULL_CACHE_TTL);
        return this.seoPort.createNotFoundMetaHTML();
      }

      urlData = {
        id: url.id,
        alias: url.alias,
        url: url.url,
        password: url.password,
        owner_id: url.owner_id,
        is_active: url.is_active,
        views: url.views,
        seo_data: url.seo_data,
        exp: url.exp ? url.exp.toISOString() : null,
      };

      await this.redisService.set(cacheKey, urlData, URL_CACHE_TTL);
    }

    // ── 2. Generate SEO HTML ──────────────────────────────────
    if (urlData.password) {
      return this.seoPort.createProtectedMetaHTML();
    }

    const seoData = urlData.seo_data ?? {
      title: null,
      description: null,
      og_image: null,
      og_title: null,
      og_description: null,
      og_url: null,
    };
    return this.seoPort.createMetaHTML(seoData);
  }
}
