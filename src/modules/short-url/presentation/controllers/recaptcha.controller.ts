import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceResponse } from '../../../../shared/responses/service-response';
import { VerifyRecaptchaDTO } from '../dtos/verify-recaptcha.dto';
import { VerifyRecaptchaUseCase } from '../../application/use-cases/verify-recaptcha.usecase';

@ApiTags('reCAPTCHA')
@Controller('view/recaptcha')
export class RecaptchaController {
  constructor(
    private readonly verifyRecaptchaUseCase: VerifyRecaptchaUseCase,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Verify a reCAPTCHA token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'reCAPTCHA verified successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid token' })
  async verifyRecaptcha(@Body() body: VerifyRecaptchaDTO) {
    console.log('body', body);

    const data = await this.verifyRecaptchaUseCase.execute(body.token);
    return ServiceResponse.success('reCAPTCHA verified successfully', data);
  }
}
