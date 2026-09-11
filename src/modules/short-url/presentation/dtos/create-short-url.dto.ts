import { IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShortUrlDTO {
  @ApiProperty({
    description: 'Original URL to shorten',
    example: 'https://www.example.com/very-long-url-path',
  })
  @IsUrl({ require_tld: false }, { message: 'URL không hợp lệ' })
  url: string;

  @ApiPropertyOptional({
    description: 'Custom alias for the short URL (3–30 characters). If omitted, an alias is generated automatically',
    example: 'my-link',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @IsOptional()
  @MinLength(3, { message: 'Alias tối thiểu 3 ký tự' })
  @MaxLength(30, { message: 'Alias tối đa 30 ký tự' })
  alias?: string;

  @ApiProperty({
    description: 'Password to protect the short URL (optional)',
    required: false,
    example: 'secret123',
    minLength: 3,
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  password?: string;
}
