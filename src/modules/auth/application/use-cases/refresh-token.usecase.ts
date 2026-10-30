import { Injectable, UnauthorizedException } from "@nestjs/common";
import { TokenPayload, TokenService } from "../ports/token";
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
        let payload: TokenPayload;
        try {
            payload = await this.tokenService.decodeToken(input.refreshToken);
        } catch {
            throw new UnauthorizedException('Refresh token is invalid or expired');
        }
        if (!payload || payload.type !== TokenType.REFRESH_TOKEN || !payload.userId) {
            throw new UnauthorizedException("Invalid token");
        }

        // 2. Check token hash in DB
        const tokenHash = PrismaRefreshTokenRepository.hashToken(input.refreshToken);
        const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

        if (!storedToken) {
            throw new UnauthorizedException("Refresh token is invalid or revoked.");
        }

        // 3. Check if token is expired
        if (storedToken.expiresAt < new Date()) {
            await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
            throw new UnauthorizedException("Refresh token expired");
        }

        // Rotate atomically after generating the replacement; failed writes preserve the old session.

        // 5. Generate new tokens
        const [accessToken, refreshToken] = await Promise.all([
            this.tokenService.generateAccessToken({ userId: payload.userId, type: TokenType.ACCESS_TOKEN }),
            this.tokenService.generateRefreshToken({ userId: payload.userId, type: TokenType.REFRESH_TOKEN }),
        ]);

        // 6. Save new refresh token hash in DB
        const refreshExpirationMs = ms(
            this.configService.get('REFRESH_TOKEN_EXPIRATION_TIME', { infer: true }) as ms.StringValue
        );
        const rotated = await this.refreshTokenRepository.rotate(tokenHash, {
            tokenHash: PrismaRefreshTokenRepository.hashToken(refreshToken),
            userId: payload.userId,
            expiresAt: new Date(Date.now() + refreshExpirationMs),
        });

        if (!rotated) throw new UnauthorizedException('Refresh token was already rotated or revoked');
        return { accessToken, refreshToken };
    }
}
