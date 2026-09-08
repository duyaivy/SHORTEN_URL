import { Injectable } from "@nestjs/common";
import { TokenPayload, TokenService } from "../application/ports/token";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../shared/config/env.validation";
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JWTTokenService implements TokenService {
    constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}
    async decodeToken(token: string): Promise<TokenPayload> {
        const jwtSecret = this.configService.get('SECRET_OR_PUBLIC_JWT_KEY', { infer: true });
        return jwt.verify(token, jwtSecret as string) as TokenPayload;
    }
    async generateAccessToken(payload: TokenPayload): Promise<string> {
      const jwtSecret = this.configService.get('SECRET_OR_PUBLIC_JWT_KEY', { infer: true });
      const expiresIn = this.configService.get('ACCESS_TOKEN_EXPIRATION_TIME', { infer: true });
      return jwt.sign(payload, jwtSecret as string,{
        expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      });
    }
    async generateRefreshToken(payload: TokenPayload): Promise<string> {
      const jwtSecret = this.configService.get('SECRET_OR_PUBLIC_JWT_KEY', { infer: true });
      const expiresIn = this.configService.get('REFRESH_TOKEN_EXPIRATION_TIME', { infer: true });
      return jwt.sign(payload, jwtSecret as string, {
        expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
     });
    }
    async verifyToken(token: string): Promise<boolean> {
       const jwtSecret = this.configService.get('SECRET_OR_PUBLIC_JWT_KEY', { infer: true });
       try {
        jwt.verify(token, jwtSecret as string);
        return true;
       } catch (error) {
        return false;
       }
    }
    
}