import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../../../auth/application/ports/token';

/**
 * Optional JWT guard — does NOT throw if token is missing.
 * Sets req.userId if a valid token is present, otherwise continues.
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.access_token;
    if (!token) {
      return true; // allow without auth
    }
    try {
      const isValid = await this.tokenService.verifyToken(token);
      if (isValid) {
        const payload = await this.tokenService.decodeToken(token);
        req.userId = payload.userId;
      }
    } catch {
      // token invalid but we still allow the request
    }
    return true;
  }
}
