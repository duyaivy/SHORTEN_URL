import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { RegisterDTO } from "../dto/register.dto";
import { RegisterUseCase } from "../../application/use-cases/register.usecase";
import { ServiceResponse } from "../../../../shared/responses/service-response";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDTO) {
    const user = await this.registerUseCase.execute(body);
    return ServiceResponse.success(
      'Đăng ký tài khoản thành công',
      user,
      HttpStatus.CREATED,
    );
  }
}