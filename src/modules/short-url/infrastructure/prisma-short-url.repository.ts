import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/services/prisma.service';
import { ShortUrl, SeoData } from '../domain/entities/short-url.entity';
import {
  PaginationParams,
  ShortUrlRepository,
} from '../domain/repositories/short-url.repository';

@Injectable()
export class PrismaShortUrlRepository implements ShortUrlRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    alias: string;
    url: string;
    password: string | null;
    owner_id: string | null;
    is_active: boolean;
    seo_data: SeoData | null;
    exp: Date | null;
  }): Promise<ShortUrl> {
    const record = await this.prisma.shortUrl.create({
      data: { ...data, seo_data: data.seo_data as any },
    });
    return this.mapToEntity(record);
  }

  async findByAlias(alias: string): Promise<ShortUrl | null> {
    const record = await this.prisma.shortUrl.findUnique({
      where: { alias, is_active: true },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async findByAliasAndIncrementViews(alias: string): Promise<ShortUrl | null> {
    try {
      const record = await this.prisma.shortUrl.update({
        where: { alias, is_active: true },
        data: { views: { increment: 1 } },
      });
      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  async findByAliasAndPasswordAndIncrementViews(
    alias: string,
    _password: string,
  ): Promise<ShortUrl | null> {
    try {
      const record = await this.prisma.shortUrl.update({
        where: { alias, is_active: true },
        data: { views: { increment: 1 } },
      });
      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  async findByOwner(
    owner_id: string,
    params: PaginationParams,
  ): Promise<ShortUrl[]> {
    const skip = (params.page - 1) * params.limit;
    const records = await this.prisma.shortUrl.findMany({
      where: { owner_id },
      skip,
      take: params.limit,
      orderBy: { created_at: 'desc' },
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async countByOwner(owner_id: string): Promise<number> {
    return this.prisma.shortUrl.count({ where: { owner_id } });
  }

  async update(
    id: string,
    data: {
      alias?: string;
      url?: string;
      password?: string | null;
      is_active?: boolean;
    },
  ): Promise<ShortUrl | null> {
    try {
      const record = await this.prisma.shortUrl.update({
        where: { id },
        data,
      });
      return this.mapToEntity(record);
    } catch {
      return null;
    }
  }

  async updateManyActive(
    urls: { id: string; is_active: boolean }[],
    owner_id: string,
  ): Promise<void> {
    await Promise.all(
      urls.map((u) =>
        this.prisma.shortUrl.updateMany({
          where: { id: u.id, owner_id },
          data: { is_active: u.is_active },
        }),
      ),
    );
  }

  async deleteByIdsAndOwner(
    ids: string[],
    owner_id: string,
  ): Promise<void> {
    await this.prisma.shortUrl.deleteMany({
      where: {
        id: { in: ids },
        owner_id,
      },
    });
  }

  private mapToEntity(record: {
    id: string;
    alias: string;
    url: string;
    password: string | null;
    owner_id: string | null;
    is_active: boolean;
    views: number;
    seo_data: any;
    exp: Date | null;
    created_at: Date;
    updated_at: Date;
  }): ShortUrl {
    return new ShortUrl(
      record.id,
      record.alias,
      record.url,
      record.password,
      record.owner_id,
      record.is_active,
      record.views,
      record.seo_data as SeoData | null,
      record.exp,
      record.created_at,
      record.updated_at,
    );
  }
}
