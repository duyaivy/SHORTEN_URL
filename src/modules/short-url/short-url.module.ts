import { Module } from '@nestjs/common';
import { PasswordHasher } from '../auth/application/ports/password-hasher';
import { ArgonPasswordHasher } from '../auth/infrastructure/argon2-password-hasher';
import { TokenService } from '../auth/application/ports/token';
import { JWTTokenService } from '../auth/infrastructure/jwt-token.services';
import { ShortUrlRepository } from './domain/repositories/short-url.repository';
import { QrScanHistoryRepository } from './domain/repositories/qr-scan-history.repository';
import { SeoPort } from './application/ports/seo.port';
import { RecaptchaPort } from './application/ports/recaptcha.port';
import { PrismaShortUrlRepository } from './infrastructure/prisma-short-url.repository';
import { PrismaQrScanHistoryRepository } from './infrastructure/prisma-qr-scan-history.repository';
import { AxiosSeoService } from './infrastructure/axios-seo.service';
import { GoogleRecaptchaService } from './infrastructure/google-recaptcha.service';
import { CreateShortUrlUseCase } from './application/use-cases/create-short-url.usecase';
import { GetShortUrlUseCase } from './application/use-cases/get-short-url.usecase';
import { GetShortUrlSeoUseCase } from './application/use-cases/get-short-url-seo.usecase';
import { GetShortUrlWithPasswordUseCase } from './application/use-cases/get-short-url-with-password.usecase';
import { UpdateUrlUseCase } from './application/use-cases/update-url.usecase';
import { UpdateUrlActiveUseCase } from './application/use-cases/update-url-active.usecase';
import { DeleteUrlsUseCase } from './application/use-cases/delete-urls.usecase';
import { GetMyUrlsUseCase } from './application/use-cases/get-my-urls.usecase';
import { CreateQrHistoryUseCase } from './application/use-cases/create-qr-history.usecase';
import { GetMyQrHistoriesUseCase } from './application/use-cases/get-my-qr-histories.usecase';
import { DeleteQrHistoriesUseCase } from './application/use-cases/delete-qr-histories.usecase';
import { VerifyRecaptchaUseCase } from './application/use-cases/verify-recaptcha.usecase';
import { ShortUrlController } from './presentation/controllers/short-url.controller';

@Module({
  controllers: [ShortUrlController],
  providers: [
    // Use Cases
    CreateShortUrlUseCase,
    GetShortUrlUseCase,
    GetShortUrlSeoUseCase,
    GetShortUrlWithPasswordUseCase,
    UpdateUrlUseCase,
    UpdateUrlActiveUseCase,
    DeleteUrlsUseCase,
    GetMyUrlsUseCase,
    CreateQrHistoryUseCase,
    GetMyQrHistoriesUseCase,
    DeleteQrHistoriesUseCase,
    VerifyRecaptchaUseCase,
    // Port bindings
    { provide: ShortUrlRepository, useClass: PrismaShortUrlRepository },
    {
      provide: QrScanHistoryRepository,
      useClass: PrismaQrScanHistoryRepository,
    },
    { provide: SeoPort, useClass: AxiosSeoService },
    { provide: RecaptchaPort, useClass: GoogleRecaptchaService },
    { provide: PasswordHasher, useClass: ArgonPasswordHasher },
    { provide: TokenService, useClass: JWTTokenService },
  ],
})
export class ShortUrlModule {}
