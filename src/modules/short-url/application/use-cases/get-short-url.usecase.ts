import { Injectable, NotFoundException } from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';

@Injectable()
export class GetShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
  ) {}

  /**
   * Dành cho người dùng thật:
   * - Tìm URL theo alias (is_active: true)
   * - Tự động tăng views +1
   * - Trả về dữ liệu để FE tự redirect (tránh CORS)
   */
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

    // Trả về đúng format spec: { _id, alias, url, views, is_active }
    // password KHÔNG được trả về client
    return {
      _id: url.id,
      alias: url.alias,
      url: url.url,
      views: url.views,
      is_active: url.is_active,
    };
  }
}
