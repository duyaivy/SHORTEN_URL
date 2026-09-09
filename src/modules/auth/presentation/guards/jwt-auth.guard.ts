import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { TokenService } from "../../application/ports/token";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly tokenService: TokenService,
    ) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        console.log(req.cookies);
        const token = req.cookies?.access_token;
        if (!token) {
            throw new UnauthorizedException('Token is invalid');
        }
        try {
            const payload = await this.tokenService.verifyToken(token);
            if (!payload) {
                throw new UnauthorizedException('Token is invalid');
            }
            const tokenPayload = await this.tokenService.decodeToken(token)
            req.userId = tokenPayload.userId;
        } catch (error) {
            throw new UnauthorizedException('Token is invalid');
        }
        return true;
    }

}