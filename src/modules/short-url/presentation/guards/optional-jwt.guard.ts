import { ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../../../auth/application/ports/token';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';

@Injectable()
export class OptionalJwtGuard extends JwtAuthGuard {
  constructor(tokenService: TokenService) { super(tokenService); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Only an intentionally anonymous request may proceed without authentication.
    // Cookie presence matters even when its value is empty/malformed.
    const hasCredentials = Object.hasOwn(req.cookies ?? {}, 'access_token') ||
      Object.hasOwn(req.cookies ?? {}, 'refresh_token');
    if (!hasCredentials && req.headers['x-auth-intent'] !== 'required') {
      delete req.userId;
      return true;
    }
    return super.canActivate(context);
  }
}
