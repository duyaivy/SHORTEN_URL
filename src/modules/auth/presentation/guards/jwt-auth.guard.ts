import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { TokenService } from '../../application/ports/token';
import { TokenType } from '../../domain/enums/jwt.enum';

export const sessionRequired = () => new UnauthorizedException({
  message: 'Your session has expired. Please log in again.',
  data: { code: 'SESSION_REQUIRED' },
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    delete req.userId;
    const token = req.cookies?.access_token;
    if (!token || typeof token !== 'string') throw sessionRequired();
    try {
      // decodeToken verifies signature and expiration; never trust an unverified payload.
      const payload = await this.tokenService.decodeToken(token);
      if (payload.type !== TokenType.ACCESS_TOKEN || !payload.userId || typeof payload.userId !== 'string') {
        throw sessionRequired();
      }
      req.userId = payload.userId;
    } catch {
      throw sessionRequired();
    }
    return true;
  }
}
