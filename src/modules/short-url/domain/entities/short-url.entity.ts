export interface SeoData {
  title: string | null;
  description: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  og_url: string | null;
}

export class ShortUrl {
  constructor(
    public readonly id: string,
    public readonly alias: string,
    public readonly url: string,
    public readonly password: string | null,
    public readonly owner_id: string | null,
    public readonly is_active: boolean,
    public readonly views: number,
    public readonly seo_data: SeoData | null,
    public readonly exp: Date | null,
    public readonly created_at: Date,
    public readonly updated_at: Date,
  ) {}
}
