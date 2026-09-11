import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUrlDTO {
  @ApiProperty({
    description: 'New alias for the short URL (3–30 characters)',
    required: false,
    example: 'new-alias',
    minLength: 3,
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Alias tối thiểu 3 ký tự' })
  @MaxLength(30, { message: 'Alias tối đa 30 ký tự' })
  alias?: string;

  @ApiProperty({
    description: 'New original URL',
    required: false,
    example: 'https://new-url.example.com',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL không hợp lệ' })
  url?: string;

  @ApiProperty({
    description: 'New password for the short URL',
    required: false,
    example: 'newpassword123',
    minLength: 3,
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  password?: string;

  @ApiProperty({
    description: 'Enable or disable the short URL',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'is_active phải là boolean' })
  is_active?: boolean;
}
