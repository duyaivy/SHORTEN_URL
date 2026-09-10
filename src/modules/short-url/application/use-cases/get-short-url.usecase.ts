import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../../shared/config/env.validation';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

@Injectable()
export class GetShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async execute(alias: string) {
    const aliasText = encodeURIComponent(alias);

    const url =
      await this.shortUrlRepository.findByAliasAndIncrementViews(aliasText);
    if (!url) {
      throw new NotFoundException({
        message: 'Không tìm thấy URL',
        data: [{ field: 'params.alias', message: 'URL không tồn tại hoặc đã bị tắt' }],
      });
    }

    if (url.password) {
      const clientShortLink =
        this.configService.get('CLIENT_SHORT_LINK', { infer: true }) || '';
      const passwordUrl = `${clientShortLink}/password/${aliasText}`;
      const { password, ...rest } = url;
      return { ...rest, url: passwordUrl };
    }

    const { password, ...rest } = url;
    return rest;
  }
}
