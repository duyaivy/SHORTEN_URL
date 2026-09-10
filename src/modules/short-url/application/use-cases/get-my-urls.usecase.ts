import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../../shared/config/env.validation';
import {
  PaginationParams,
  PaginationResult,
  ShortUrlRepository,
} from '../../domain/repositories/short-url.repository';
import { ShortUrl } from '../../domain/entities/short-url.entity';

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;

@Injectable()
export class GetMyUrlsUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async execute(
    query: { limit?: number; page?: number },
    userId: string,
  ): Promise<PaginationResult<Omit<ShortUrl, 'password'> & { short_url: string }>> {
    const limit = Number(query.limit) || DEFAULT_LIMIT;
    const page = Number(query.page) || DEFAULT_PAGE;

    const [data, totalDocuments] = await Promise.all([
      this.shortUrlRepository.findByOwner(userId, { limit, page }),
      this.shortUrlRepository.countByOwner(userId),
    ]);

    const clientShortLink =
      this.configService.get('CLIENT_SHORT_LINK', { infer: true }) || '';

    return {
      control: {
        total: Math.ceil(totalDocuments / limit),
        page,
        limit,
      },
      data: data.map((item) => {
        const { password, ...rest } = item;
        return {
          ...rest,
          short_url: `${clientShortLink}/${item.alias}`,
        };
      }),
    };
  }
}
