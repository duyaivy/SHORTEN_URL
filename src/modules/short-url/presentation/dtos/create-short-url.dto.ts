import { IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateShortUrlDTO {
  @IsUrl({ require_tld: false }, { message: 'URL không hợp lệ' })
  url: string;

  @IsString()
  @MinLength(3, { message: 'Alias tối thiểu 3 ký tự' })
  @MaxLength(30, { message: 'Alias tối đa 30 ký tự' })
  alias: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  password?: string;
}
