import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { RegisterDTO } from "../dto/register.dto";
import { LoginDTO } from "../dto/login.dto";
import { RegisterUseCase } from "../../application/use-cases/register.usecase";
import { LoginUseCase } from "../../application/use-cases/login.usecase";
import { ServiceResponse } from "../../../../shared/responses/service-response";
import { LoginWithGoogleUseCase } from "../../application/use-cases/login-with-google.usecase";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: RegisterDTO) {
    const user = await this.registerUseCase.execute(body);
    return ServiceResponse.success(
      "Đăng ký tài khoản thành công",
      user,
      HttpStatus.CREATED,
    );
  }
  @Post("login")
  async login(@Body() body: LoginDTO) {
    const data = await this.loginUseCase.execute(body);
    return ServiceResponse.success("Đăng nhập thành công", data, HttpStatus.OK);
  }
  @Get("oauth")
  async loginWithGoogle(@Query() query: { code: string }) {
    const data = await this.loginWithGoogleUseCase.execute(query);
    return ServiceResponse.success("Đăng nhập thành công", data, HttpStatus.OK);
  }
}
