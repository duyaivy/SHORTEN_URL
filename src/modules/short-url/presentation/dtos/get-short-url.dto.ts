import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetShortUrlWithPasswordDTO {
  @ApiProperty({
    description: 'Password to access the short URL (if password-protected)',
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
