

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


@Module({
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    {
        provide: UserRepository,
        useClass: PrismaUserRepository
    },{
        provide: PasswordHasher,
        useClass: ArgonPasswordHasher
    },
    {
        provide: TokenService,
        useClass: JWTTokenService
    },
  ],
})
export class AuthModule {}
