import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyRecaptchaDTO {
  @ApiProperty({
    description: 'reCAPTCHA token from the Google reCAPTCHA widget',
    example: '03AGdBq26P...',
  })
  @IsString({ message: 'Token phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;
}
