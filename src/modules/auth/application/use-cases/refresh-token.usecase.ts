import { Injectable, UnauthorizedException } from "@nestjs/common";
import { TokenService } from "../ports/token";
import { TokenType } from "../../domain/enums/jwt.enum";
import { RefreshTokenRepository } from "../../domain/repositories/refresh-token.repository";
import { PrismaRefreshTokenRepository } from "../../infrastructure/prisma-refresh-token.repository";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../../shared/config/env.validation";
import ms from 'ms';

@Injectable()
export class RefreshTokenUseCase {
    constructor(
        private readonly tokenService: TokenService,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly configService: ConfigService<EnvironmentVariables, true>,
    ) { }

    async execute(input: { refreshToken: string }): Promise<any> {
        // 1. Decode & validate token type
        const payload = await this.tokenService.decodeToken(input.refreshToken);
        if (!payload || payload.type !== TokenType.REFRESH_TOKEN) {
            throw new UnauthorizedException("Invalid token");
        }

        // 2. Check token hash in DB
        const tokenHash = PrismaRefreshTokenRepository.hashToken(input.refreshToken);
        const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

        if (!storedToken) {
            await this.refreshTokenRepository.deleteAllByUserId(payload.userId);
            throw new UnauthorizedException("Token reuse detected. All sessions have been revoked.");
        }

        // 3. Check if token is expired
        if (storedToken.expiresAt < new Date()) {
            await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
            throw new UnauthorizedException("Refresh token expired");
        }

        // 4. Delete old token from DB (rotation)
        await this.refreshTokenRepository.deleteByTokenHash(tokenHash);

        // 5. Generate new tokens
        const [accessToken, refreshToken] = await Promise.all([
            this.tokenService.generateAccessToken({ userId: payload.userId, type: TokenType.ACCESS_TOKEN }),
            this.tokenService.generateRefreshToken({ userId: payload.userId, type: TokenType.REFRESH_TOKEN }),
        ]);

        // 6. Save new refresh token hash in DB
        const refreshExpirationMs = ms(
            this.configService.get('REFRESH_TOKEN_EXPIRATION_TIME', { infer: true }) as ms.StringValue
        );
        await this.refreshTokenRepository.create({
            tokenHash: PrismaRefreshTokenRepository.hashToken(refreshToken),
            userId: payload.userId,
            expiresAt: new Date(Date.now() + refreshExpirationMs),
        });

        return { accessToken, refreshToken };
    }
}
