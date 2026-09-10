import { ShortUrl, SeoData } from '../entities/short-url.entity';

export interface PaginationParams {
  limit: number;
  page: number;
}

export interface PaginationResult<T> {
  data: T[];
  control: {
    total: number;
    page: number;
    limit: number;
  };
}

export abstract class ShortUrlRepository {
  abstract create(data: {
    alias: string;
    url: string;
    password: string | null;
    owner_id: string | null;
    is_active: boolean;
    seo_data: SeoData | null;
    exp: Date | null;
  }): Promise<ShortUrl>;

  abstract findByAlias(alias: string): Promise<ShortUrl | null>;

  abstract findByAliasAndIncrementViews(alias: string): Promise<ShortUrl | null>;

  abstract findByAliasAndPasswordAndIncrementViews(
    alias: string,
    password: string,
  ): Promise<ShortUrl | null>;

  abstract findByOwner(
    owner_id: string,
    params: PaginationParams,
  ): Promise<ShortUrl[]>;

  abstract countByOwner(owner_id: string): Promise<number>;

  abstract update(
    id: string,
    data: {
      alias?: string;
      url?: string;
      password?: string | null;
      is_active?: boolean;
    },
  ): Promise<ShortUrl | null>;

  abstract updateManyActive(
    urls: { id: string; is_active: boolean }[],
    owner_id: string,
  ): Promise<void>;

  abstract deleteByIdsAndOwner(ids: string[], owner_id: string): Promise<void>;
}
