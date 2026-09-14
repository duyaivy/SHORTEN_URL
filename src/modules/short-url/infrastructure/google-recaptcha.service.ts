import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EnvironmentVariables } from '../../../shared/config/env.validation';
import { RecaptchaPort } from '../application/ports/recaptcha.port';

@Injectable()
export class GoogleRecaptchaService implements RecaptchaPort {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async verify(
    token: string,
  ): Promise<{ success: boolean; [key: string]: unknown }> {
    const secretKey = this.configService.get('SECRECT_KEY_RECAPCHA', {
      infer: true,
    });
    const { data } = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: { secret: secretKey, response: token },
      },
    );
    return data;
  }
}
