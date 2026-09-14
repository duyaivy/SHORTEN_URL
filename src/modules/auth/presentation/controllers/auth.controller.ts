import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
import { Request, Response } from "express";
import ms from 'ms';
import { RefreshTokenUseCase } from "../../application/use-cases/refresh-token.usecase";
import { Throttle } from "@nestjs/throttler";
import { ForgotPasswordDTO } from "../dtos/forgot-password.dto";
import { ForgotPasswordUseCase } from "../../application/use-cases/forgot-password.usecase";
import { ResetPasswordUseCase } from "../../application/use-cases/reset-password.usecase";
import { ResetPasswordDTO } from "../dtos/reset-password.dto";

@ApiTags('Auth')
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly loginWithGoogleUseCase: LoginWithGoogleUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly configService: ConfigService<EnvironmentVariables, true>
  ) { }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Account registered successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Email already exists' })
  async register(@Body() body: RegisterDTO) {
    const user = await this.registerUseCase.execute(body);
    return ServiceResponse.success(
      "Account registered successfully",
      user,
      HttpStatus.CREATED,
    );
  }

  @Post("login")
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful; access & refresh tokens returned via cookies' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid email or password' })
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

    return ServiceResponse.success("Login successful", data, HttpStatus.OK);
  }

  @Get("oauth")
  @ApiOperation({ summary: 'Login with Google OAuth', description: 'Exchange an authorization code from the Google OAuth flow for tokens' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Google login successful' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid authorization code' })
  async loginWithGoogle(@Query() query: { code: string }) {
    const data = await this.loginWithGoogleUseCase.execute(query);
    return ServiceResponse.success("Login successful", data, HttpStatus.OK);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token is invalid or expired' })
  async getMe(@CurrentUserId() userId: string) {
    const user = await this.getMeUseCase.execute(userId);
    return ServiceResponse.success("Profile retrieved successfully", user, HttpStatus.OK);
  }

  @Post('refresh-token')
  @ApiCookieAuth('refresh-token-cookie')
  @ApiOperation({ summary: 'Refresh the access token', description: 'Use the refresh token stored in the cookie to issue a new access token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Token refreshed successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token is invalid or expired' })
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Token is invalid');
    }
    const data = await this.refreshTokenUseCase.execute({ refreshToken });
    const accessExpiration =
      this.configService.get<string>(
        'ACCESS_TOKEN_EXPIRATION_TIME',
      )!;
    const refreshExpiration =
      this.configService.get<string>(
        'REFRESH_TOKEN_EXPIRATION_TIME',
      )!;
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

    return ServiceResponse.success("Token refreshed successfully", data, HttpStatus.OK);
  }

  @Throttle({
    default:
      { limit: 3, ttl: 60000 }
  })
  @Get("forgot-password")
  @ApiOperation({ summary: 'Send password reset email', description: 'Rate-limited to 3 requests per minute' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reset email sent successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid email format' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many requests' })
  async forgotPassword(@Query() query: ForgotPasswordDTO) {
    const data = await this.forgotPasswordUseCase.execute(query.email);
    return ServiceResponse.success("Password reset email sent", data, HttpStatus.OK);
  }

  @Throttle({
    default:
      { limit: 3, ttl: 60000 }
  })
  @Post("reset-password")
  @ApiOperation({ summary: 'Reset password', description: 'Use the token received via email to set a new password. Rate-limited to 3 requests per minute' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password reset successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid token or password does not meet requirements' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token is expired or does not exist' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Too many requests' })
  async resetPassword(@Body() body: ResetPasswordDTO) {
    const data = await this.resetPasswordUseCase.execute(body);
    return ServiceResponse.success("Password reset successfully", data, HttpStatus.OK);
  }
}
