import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../../shared/config/env.validation';
import {
  CachedShortUrl,
  makeUrlCacheKey,
  URL_CACHE_TTL,
  URL_NULL_CACHE_TTL,
} from '../../../../shared/types/cached-short-url.type';
import { RedisService } from '../../../../shared/services/redis.service';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { AnalyticsProducer } from '../../infrastructure/queues/analytics.producer';

export interface RedirectResult {
  redirectUrl: string;
  hasPassword: boolean;
}

@Injectable()
export class GetShortUrlRedirectUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly redisService: RedisService,
    private readonly analyticsProducer: AnalyticsProducer,
    private readonly configService: ConfigService<EnvironmentVariables>,
  ) { }

  async execute(alias: string): Promise<RedirectResult> {
    const aliasText = encodeURIComponent(alias);
    const cacheKey = makeUrlCacheKey(aliasText);

    let urlData: CachedShortUrl | undefined;

    const cached = await this.redisService.get<CachedShortUrl>(cacheKey);

    if (cached === null) {
      throw new NotFoundException({
        message: 'Không tìm thấy URL',
        data: [{ field: 'params.alias', message: 'URL không tồn tại hoặc đã bị tắt' }],
      });
    }

    if (cached !== undefined) {
      urlData = cached;
    } else {
      const url = await this.shortUrlRepository.findByAlias(aliasText);

      if (!url || !url.is_active) {
        await this.redisService.setNull(cacheKey, URL_NULL_CACHE_TTL);
        throw new NotFoundException({
          message: 'Không tìm thấy URL',
          data: [{ field: 'params.alias', message: 'URL không tồn tại hoặc đã bị tắt' }],
        });
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

    if (urlData.password) {
      const clientUrl =
        this.configService.get('CLIENT_URL', { infer: true }) || '';
      return {
        redirectUrl: `${clientUrl}/a/password/${alias}`,
        hasPassword: true,
      };
    }

    await this.analyticsProducer.pushClickEvent(aliasText);

    return {
      redirectUrl: urlData.url,
      hasPassword: false,
    };
  }
}
