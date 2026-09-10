import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SeoPort } from '../application/ports/seo.port';
import { SeoData } from '../domain/entities/short-url.entity';

@Injectable()
export class AxiosSeoService implements SeoPort {
  private readonly logger = new Logger(AxiosSeoService.name);

  async getSeoData(url: string): Promise<SeoData> {
    const result: SeoData = {
      title: null,
      description: null,
      og_image: null,
      og_title: null,
      og_description: null,
      og_url: null,
    };

    try {
      const { data: html } = await axios.get(url, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/si);
      if (titleMatch) result.title = titleMatch[1].trim();

      const descMatch = html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["'][^>]*>/si,
      );
      if (descMatch) result.description = descMatch[1].trim();

      const ogImageMatch = html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["'][^>]*>/si,
      );
      if (ogImageMatch) result.og_image = ogImageMatch[1].trim();

      const ogTitleMatch = html.match(
        /<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["'][^>]*>/si,
      );
      if (ogTitleMatch) result.og_title = ogTitleMatch[1].trim();

      const ogDescMatch = html.match(
        /<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["'][^>]*>/si,
      );
      if (ogDescMatch) result.og_description = ogDescMatch[1].trim();

      const ogUrlMatch = html.match(
        /<meta[^>]*property=["']og:url["'][^>]*content=["'](.*?)["'][^>]*>/si,
      );
      if (ogUrlMatch) result.og_url = ogUrlMatch[1].trim();
    } catch (error) {
      this.logger.warn(`Failed to fetch SEO data for ${url}: ${error}`);
    }

    return result;
  }

  createMetaHTML(data: SeoData): string {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${data.title ? `<meta name="title" content="${this.escapeHtml(data.title)}">` : ''}
${data.description ? `<meta name="description" content="${this.escapeHtml(data.description)}">` : ''}
${data.og_title ? `<meta property="og:title" content="${this.escapeHtml(data.og_title)}">` : ''}
${data.og_description ? `<meta property="og:description" content="${this.escapeHtml(data.og_description)}">` : ''}
${data.og_image ? `<meta property="og:image" content="${this.escapeHtml(data.og_image)}">` : ''}
${data.og_url ? `<meta property="og:url" content="${this.escapeHtml(data.og_url)}">` : ''}
<title>${this.escapeHtml(data.title || data.og_title || '')}</title>`;
  }

  createNotFoundMetaHTML(): string {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="URL not found">
<meta property="og:description" content="The URL you are looking for does not exist or has been deactivated.">
<title>URL not found</title>`;
  }

  createProtectedMetaHTML(): string {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta property="og:title" content="URL protected">
<meta property="og:description" content="This URL is protected by a password.">
<title>URL protected</title>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
