import {
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addDays } from 'date-fns';
import { EnvironmentVariables } from '../../../../shared/config/env.validation';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { SeoPort } from '../ports/seo.port';
import { PasswordHasher } from '../../../auth/application/ports/password-hasher';

export interface CreateShortUrlInput {
  url: string;
  alias: string;
  password?: string;
}

@Injectable()
export class CreateShortUrlUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly seoPort: SeoPort,
    private readonly passwordHasher: PasswordHasher,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async execute(input: CreateShortUrlInput, userId?: string) {
    const aliasText = encodeURIComponent(input.alias);

    const existing = await this.shortUrlRepository.findByAlias(aliasText);
    if (existing) {
      throw new UnprocessableEntityException({
        message: 'Alias đã tồn tại',
        data: [{ field: 'body.alias', message: 'Alias đã tồn tại' }],
      });
    }

    const clientShortLink =
      this.configService.get('CLIENT_SHORT_LINK', { infer: true }) || '';
    const shortUrl = `${clientShortLink}/${aliasText}`;

    const seoData = await this.seoPort.getSeoData(input.url);

    const hashedPassword = input.password
      ? await this.passwordHasher.hash(input.password)
      : null;

    const exp = userId ? null : addDays(new Date(), 14);

    const record = await this.shortUrlRepository.create({
      alias: aliasText,
      url: input.url,
      password: hashedPassword,
      owner_id: userId || null,
      is_active: true,
      seo_data: seoData,
      exp,
    });

    const { password, ...result } = record;
    return { ...result, short_url: shortUrl };
  }
}
