import { Injectable, BadRequestException } from '@nestjs/common';
import { RecaptchaPort } from '../ports/recaptcha.port';

@Injectable()
export class VerifyRecaptchaUseCase {
  constructor(private readonly recaptchaPort: RecaptchaPort) {}

  async execute(token: string) {
    try {
      const result = await this.recaptchaPort.verify(token);
      if (!result.success) {
        throw new Error('reCAPTCHA verification failed');
      }
      return result;
    } catch {
      throw new BadRequestException({
        message: 'Xác minh reCAPTCHA thất bại',
        data: [{ field: 'body.token', message: 'reCAPTCHA token không hợp lệ' }],
      });
    }
  }
}
