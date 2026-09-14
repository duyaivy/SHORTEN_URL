import { TokenType } from "../../domain/enums/jwt.enum";

export interface TokenPayload {
  userId: string;
  type: TokenType;
  iat?: number;
  exp?: number;
}

export abstract class TokenService {
  abstract generateAccessToken(payload: TokenPayload): Promise<string>;
  abstract generateRefreshToken(payload: TokenPayload): Promise<string>;
  abstract generateForgotPasswordToken(payload: TokenPayload): Promise<string>;
  abstract verifyToken(token: string): Promise<boolean>;
  abstract decodeToken(token: string): Promise<TokenPayload>;
}
