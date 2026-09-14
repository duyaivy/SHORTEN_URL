

import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { UserRepository } from './domain/repositories/user.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { PasswordHasher } from './application/ports/password-hasher';
import { ArgonPasswordHasher } from './infrastructure/argon2-password-hasher';
import { TokenService } from './application/ports/token';
import { JWTTokenService } from './infrastructure/jwt-token.services';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { RandomGenerator } from './application/ports/random-generator';
import { CryptoRandomGenerator } from './infrastructure/crypto-random-generator';
import { LoginWithGoogleUseCase } from './application/use-cases/login-with-google.usecase';
import { GoogleOauthClient } from './infrastructure/google-oauth.client';
import { GoogleOAuth } from './application/ports/google-oauth';
import { GetMeUseCase } from './application/use-cases/get-me.usecase';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.usecase';
import { LogoutUseCase } from './application/use-cases/logout.usecase';
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { EmailSender } from './application/ports/email-sender';
import { NodeMailerSender } from './infrastructure/nodemailer-sender';


@Module({
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    LoginWithGoogleUseCase,
    GetMeUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository
    }, {
      provide: PasswordHasher,
      useClass: ArgonPasswordHasher
    },
    {
      provide: TokenService,
      useClass: JWTTokenService
    },
    {
      provide: RandomGenerator,
      useClass: CryptoRandomGenerator,
    },
    {
      provide: GoogleOAuth,
      useClass: GoogleOauthClient,
    },
    {
      provide: RefreshTokenRepository,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: EmailSender,
      useClass: NodeMailerSender,
    },
  ],
})
export class AuthModule { }
