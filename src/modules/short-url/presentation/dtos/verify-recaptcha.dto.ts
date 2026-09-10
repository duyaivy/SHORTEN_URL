import { IsString } from 'class-validator';

export class VerifyRecaptchaDTO {
  @IsString()
  token: string;
}
