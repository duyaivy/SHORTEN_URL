import { Injectable } from '@nestjs/common';
import { ShortUrlRepository } from '../../domain/repositories/short-url.repository';
import { SeoPort } from '../ports/seo.port';

@Injectable()
export class GetShortUrlSeoUseCase {
  constructor(
    private readonly shortUrlRepository: ShortUrlRepository,
    private readonly seoPort: SeoPort,
  ) {}

  async execute(alias: string): Promise<string> {
    const aliasText = encodeURIComponent(alias);

    const url = await this.shortUrlRepository.findByAlias(aliasText);
    if (!url || !url.is_active) {
      return this.seoPort.createNotFoundMetaHTML();
    }

    if (url.password) {
      return this.seoPort.createProtectedMetaHTML();
    }

    const seoData = url.seo_data || {
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
