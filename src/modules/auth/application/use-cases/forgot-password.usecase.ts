import { BadRequestException, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { UserRepository } from "../../domain/repositories/user.repository";
import { EmailSender } from "../ports/email-sender";
import { TokenService } from "../ports/token";
import { TokenType } from "../../domain/enums/jwt.enum";

@Injectable()
export class ForgotPasswordUseCase {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly emailSender: EmailSender,
        private readonly tokenService: TokenService
    ) { }
    async execute(email: string): Promise<any> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }
        const forgot_password_token = await this.tokenService.generateForgotPasswordToken({
            userId: user._id,
            type: TokenType.FORGOT_PASSWORD_TOKEN,
        });
        await this.emailSender.sendForgotPassword(email, forgot_password_token)
        return null
    }
}