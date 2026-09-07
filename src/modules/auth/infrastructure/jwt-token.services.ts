import { Injectable } from "@nestjs/common";
import { TokenPayload, TokenService } from "../application/ports/token";
import { ConfigService } from "@nestjs/config";
import { EnvironmentVariables } from "../../../shared/config/env.validation";

@Injectable()
export class JWTTokenService implements TokenService {
    constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}
    async decodeToken(token: string): Promise<TokenPayload> {
        throw new Error("Method not implemented.");
    }
    async generateAccessToken(payload: TokenPayload): Promise<string> {
        throw new Error("Method not implemented.");
    }
    async generateRefreshToken(payload: TokenPayload): Promise<string> {
        throw new Error("Method not implemented.");
    }
    async verifyToken(token: string): Promise<TokenPayload> {
        throw new Error("Method not implemented.");
    }
    
}