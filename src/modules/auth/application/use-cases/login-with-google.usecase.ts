import { Injectable } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";
import { PasswordHasher } from "../ports/password-hasher";
import { TokenService } from "../ports/token";
import { GoogleOAuth } from "../ports/google-oauth";
import { TokenType } from "../../domain/enums/jwt.enum";
import { RandomGenerator } from "../ports/random-generator";

@Injectable()
export class LoginWithGoogleUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordHasher: PasswordHasher,
        private readonly tokenService: TokenService,
        private readonly googleOAuth: GoogleOAuth,
        private readonly randomGenerator: RandomGenerator
    ) { }
    async execute(query: { code: string }): Promise<any> {
        const { id_token, access_token } = await this.googleOAuth.getGoogleOAuthToken(query.code)
        if (!id_token || !access_token) {
            throw new Error('Failed to fetch Google token')
        }
        const googleUser = await this.googleOAuth.getGoogleUserProfile(access_token, id_token)
        const userExists = await this.userRepository.findByEmail(googleUser.email)
        // kiem tra, neu co thi tra ve token, neu user khac thi them user moi
        if(!!userExists){
            // da co roi
           const [accessToken, refreshToken] = await Promise.all([
                 this.tokenService.generateAccessToken({ userId: userExists._id, type: TokenType.ACCESS_TOKEN }),
                 this.tokenService.generateRefreshToken({ userId: userExists._id, type: TokenType.REFRESH_TOKEN }),
               ]);
            return { 
                accessToken,
                refreshToken,
                user: {...userExists, password: undefined}
            }
        }
        // neu khong co
        const passwordRandorm = this.randomGenerator.generate(10)
        const hashedPassword = await this.passwordHasher.hash(passwordRandorm)
        const newUser = await this.userRepository.create({
            email: googleUser.email,
            password: hashedPassword,
            name: googleUser.name,
            avatar: googleUser.picture,
        })
        const [accessToken, refreshToken] = await Promise.all([
                 this.tokenService.generateAccessToken({ userId: newUser._id, type: TokenType.ACCESS_TOKEN }),
                 this.tokenService.generateRefreshToken({ userId: newUser._id, type: TokenType.REFRESH_TOKEN }),
               ]);
        return { 
            accessToken,
            refreshToken,
            user: {...newUser, password: undefined}
        }
    }

}