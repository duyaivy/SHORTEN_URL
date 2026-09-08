import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import { PasswordHasher } from "../ports/password-hasher";
import { UserRepository } from "../../domain/repositories/user.repository";
import { TokenService } from "../ports/token";
import { TokenType } from "../../domain/enums/jwt.enum";
@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: { email: string; password: string }): Promise<any> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnprocessableEntityException({
        message: "Email không tồn tại",
        data: [
          {
            field: "body.email",
            message: "Email không tồn tại",
          },
        ],
      });
    }
    const isPasswordValid = await this.passwordHasher.compare(
      input.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnprocessableEntityException({
        message: "Mật khẩu không chính xác",
        data: [
          {
            field: "body.password",
            message: "Mật khẩu không chính xác",
          },
        ],
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken({ userId: user._id, type: TokenType.ACCESS_TOKEN }),
      this.tokenService.generateRefreshToken({ userId: user._id, type: TokenType.REFRESH_TOKEN }),
    ]);
    return {
      accessToken,
      refreshToken,
      user: {...user, password: undefined}
    }
  }
}
