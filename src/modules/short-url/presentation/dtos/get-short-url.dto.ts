import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class GetShortUrlWithPasswordDTO {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  password?: string;
}
