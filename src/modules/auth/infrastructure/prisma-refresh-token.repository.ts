import { Injectable } from '@nestjs/common';
import { RefreshToken as PrismaRefreshToken } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../shared/services/prisma.service';
import { RefreshToken } from '../domain/entities/refresh-token.entity';
import { RefreshTokenRepository } from '../domain/repositories/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
    constructor(private readonly prisma: PrismaService) { }

    static hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async create(data: {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
    }): Promise<RefreshToken> {
        const record = await this.prisma.refreshToken.create({
            data: {
                tokenHash: data.tokenHash,
                userId: data.userId,
                expiresAt: data.expiresAt,
            },
        });
        return this.mapToEntity(record);
    }

    async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
        const record = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });
        return record ? this.mapToEntity(record) : null;
    }

    async deleteByTokenHash(tokenHash: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { tokenHash },
        });
    }

    async deleteAllByUserId(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }

    private mapToEntity(record: PrismaRefreshToken): RefreshToken {
        return new RefreshToken(
            record.id,
            record.tokenHash,
            record.userId,
            record.expiresAt,
            record.createdAt,
        );
    }
}
