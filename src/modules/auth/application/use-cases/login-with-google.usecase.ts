import { Injectable } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";
import { User } from "../../domain/entities/user.entity";
import { PasswordHasher } from "../ports/password-hasher";
import { TokenService } from "../ports/token";
import { GoogleOAuth } from "../ports/google-oauth";
import { TokenType } from "../../domain/enums/jwt.enum";
import { RandomGenerator } from "../ports/random-generator";
import { RefreshTokenRepository } from "../../domain/repositories/refresh-token.repository";
import { PrismaRefreshTokenRepository } from "../../infrastructure/prisma-refresh-token.repository";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../../shared/config/env.validation";
import ms from "ms";

@Injectable()
export class LoginWithGoogleUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly tokenService: TokenService,
        private readonly googleOAuth: GoogleOAuth,
        private readonly randomGenerator: RandomGenerator,
        private readonly refreshTokenRepository: RefreshTokenRepository,
        private readonly configService: ConfigService<EnvironmentVariables, true>,
    ) { }

    async execute(query: { code: string }): Promise<any> {
        const { id_token, access_token } = await this.googleOAuth.getGoogleOAuthToken(query.code);
        if (!id_token || !access_token) {
            throw new Error('Failed to fetch Google token');
        }

        const googleUser = await this.googleOAuth.getGoogleUserProfile(access_token, id_token);
        const userExists = await this.userRepository.findByEmail(googleUser.email);

        let user: Omit<User, 'password'> | User;
        if (userExists) {
            user = userExists;
        } else {
            const passwordRandom = this.randomGenerator.generate(10);
            const hashedPassword = await this.passwordHasher.hash(passwordRandom);
            user = await this.userRepository.create({
                email: googleUser.email,
                password: hashedPassword,
                name: googleUser.name,
                avatar: googleUser.picture,
            });
        }

        const [accessToken, refreshToken] = await Promise.all([
            this.tokenService.generateAccessToken({ userId: user._id, type: TokenType.ACCESS_TOKEN }),
            this.tokenService.generateRefreshToken({ userId: user._id, type: TokenType.REFRESH_TOKEN }),
        ]);

        const refreshExpirationMs = ms(
            this.configService.get('REFRESH_TOKEN_EXPIRATION_TIME', { infer: true }) as ms.StringValue
        );
        await this.refreshTokenRepository.create({
            tokenHash: PrismaRefreshTokenRepository.hashToken(refreshToken),
            userId: user._id,
            expiresAt: new Date(Date.now() + refreshExpirationMs),
        });

        return { 
            accessToken,
            refreshToken,
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { ...user, password: undefined }
        };
    }
}