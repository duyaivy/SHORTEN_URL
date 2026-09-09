import { Injectable } from "@nestjs/common";
import { RefreshTokenRepository } from "../../domain/repositories/refresh-token.repository";
import { PrismaRefreshTokenRepository } from "../../infrastructure/prisma-refresh-token.repository";

@Injectable()
export class LogoutUseCase {
    constructor(
        private readonly refreshTokenRepository: RefreshTokenRepository,
    ) { }

    async execute(input: { refreshToken: string }): Promise<void> {
        const tokenHash = PrismaRefreshTokenRepository.hashToken(input.refreshToken);
        await this.refreshTokenRepository.deleteByTokenHash(tokenHash);
    }
}
