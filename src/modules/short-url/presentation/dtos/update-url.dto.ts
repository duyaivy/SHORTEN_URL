import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class UpdateUrlDTO {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Alias tối thiểu 3 ký tự' })
  @MaxLength(30, { message: 'Alias tối đa 30 ký tự' })
  alias?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL không hợp lệ' })
  url?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  password?: string;

  @IsOptional()
  @IsBoolean({ message: 'is_active phải là boolean' })
  is_active?: boolean;
}
