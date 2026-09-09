import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { RegisterDTO } from "../dtos/register.dto";
import { LoginDTO } from "../dtos/login.dto";
import { RegisterUseCase } from "../../application/use-cases/register.usecase";
import { LoginUseCase } from "../../application/use-cases/login.usecase";
import { ServiceResponse } from "../../../../shared/responses/service-response";
import { LoginWithGoogleUseCase } from "../../application/use-cases/login-with-google.usecase";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetMeUseCase } from "../../application/use-cases/get-me.usecase";
import { CurrentUserId } from "../decorators/current-user-id.decorator";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../../shared/config/env.validation";
import { Response } from "express";
import ms from 'ms';

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) { }

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
  async login(
    @Body() body: LoginDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.loginUseCase.execute(body);

    const accessExpiration =
      this.configService.get<string>(
        'ACCESS_TOKEN_EXPIRATION_TIME',
      )!;
    const refreshExpiration =
      this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRATION_TIME',
      )!;
    // set cookie
    res.cookie("refresh_token", data.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: ms(refreshExpiration as ms.StringValue),
    });
    res.cookie("access_token", data.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: ms(accessExpiration as ms.StringValue),
    });

    return ServiceResponse.success("Đăng nhập thành công", data, HttpStatus.OK);
  }
  @Get("oauth")
  async loginWithGoogle(@Query() query: { code: string }) {
    const data = await this.loginWithGoogleUseCase.execute(query);
    return ServiceResponse.success("Đăng nhập thành công", data, HttpStatus.OK);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUserId() userId: string) {
    const user = await this.getMeUseCase.execute(userId);
    return ServiceResponse.success("Lấy thông tin cá nhân thành công", user, HttpStatus.OK);
  }


}
