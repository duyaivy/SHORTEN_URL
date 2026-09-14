import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";
import { EmailSender } from "../ports/email-sender";
import { TokenService } from "../ports/token";
import { PasswordHasher } from "../ports/password-hasher";
import { TokenType } from "../../domain/enums/jwt.enum";
import { RefreshTokenRepository } from "../../domain/repositories/refresh-token.repository";

export interface ResetPasswordRequest {
    password: string;
    token: string;
}

@Injectable()
export class ResetPasswordUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly emailSender: EmailSender,
        private readonly tokenService: TokenService,
        private readonly passwordHasher: PasswordHasher,
        private readonly refreshTokenRepository: RefreshTokenRepository
    ) { }

    async execute({ password, token }: ResetPasswordRequest): Promise<void> {

        // get user id from token
        // update password
        // invalidate all refresh tokens
        // send email notification
        const isValid = await this.tokenService.verifyToken(token);
        if (!isValid) {
            throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
        }

        const payload = await this.tokenService.decodeToken(token);
        if (payload.type !== TokenType.FORGOT_PASSWORD_TOKEN) {
            throw new UnauthorizedException('Token không hợp lệ');
        }
        const user = await this.userRepository.findById(payload.userId);
        if (!user) {
            throw new BadRequestException('Người dùng không tồn tại');
        }

        const hashedPassword = await this.passwordHasher.hash(password);

        await this.userRepository.updatePassword(user._id, hashedPassword);

        await this.refreshTokenRepository.deleteAllByUserId(user._id);

        await this.emailSender.sendResetPasswordEmail(user.email);
    }
}