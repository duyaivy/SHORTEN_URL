import { SeoData } from '../../domain/entities/short-url.entity';

export abstract class SeoPort {
  abstract getSeoData(url: string): Promise<SeoData>;
  abstract createMetaHTML(data: SeoData): string;
  abstract createNotFoundMetaHTML(): string;
  abstract createProtectedMetaHTML(): string;
}
