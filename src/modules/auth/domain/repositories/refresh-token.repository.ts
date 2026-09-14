import { RefreshToken } from '../entities/refresh-token.entity';

export abstract class RefreshTokenRepository {
    abstract create(data: {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
    }): Promise<RefreshToken>;

    abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

    abstract deleteByTokenHash(tokenHash: string): Promise<void>;

    /** Revoke all sessions for a user — called on token reuse detection */
    abstract deleteAllByUserId(userId: string): Promise<void>;
}
