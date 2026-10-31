import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JWTTokenService } from '../../../auth/infrastructure/jwt-token.services';
import { TokenType } from '../../../auth/domain/enums/jwt.enum';
import { OptionalJwtGuard } from './optional-jwt.guard';
import { clientOrigin, mutationOriginGuard } from '../../../../shared/config/http-security';

const tokens = new JWTTokenService(new ConfigService({ SECRET_OR_PUBLIC_JWT_KEY: 'test-only', ACCESS_TOKEN_EXPIRATION_TIME: '1h' }));
const guard = new OptionalJwtGuard(tokens);
const context = (req: object) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as ExecutionContext;

describe('optional cookie authentication', () => {
  it('allows only credential-free guests', async () => {
    expect(await guard.canActivate(context({ cookies: {}, headers: {} }))).toBe(true);
  });
  it.each([{ refresh_token: '' }, { refresh_token: 'invalid' }, { access_token: '' }, { access_token: 'malformed' }])('rejects credential presence: %j', async (cookies) => {
    await expect(guard.canActivate(context({ cookies, headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('requires a session when the client expects ownership even without cookies', async () => {
    await expect(guard.canActivate(context({ headers: { 'x-auth-intent': 'required' } }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('uses only verified access-token identity', async () => {
    const token = await tokens.generateAccessToken({ userId: 'owner', type: TokenType.ACCESS_TOKEN });
    const req = { cookies: { access_token: token }, headers: {}, userId: 'untrusted' };
    await guard.canActivate(context(req));
    expect(req.userId).toBe('owner');
  });
  it('rejects another token type even with a valid signature', async () => {
    const token = await tokens.generateAccessToken({ userId: 'owner', type: TokenType.FORGOT_PASSWORD_TOKEN });
    await expect(guard.canActivate(context({ cookies: { access_token: token }, headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('origin security', () => {
  it('normalizes frontend paths and fails closed without a configured origin', () => {
    expect(clientOrigin('https://short.test/a')).toBe('https://short.test');
    expect(() => clientOrigin(undefined)).toThrow();
  });
  it.each(['https://evil.short.test', 'null', undefined])('rejects cookie mutations from %s', (origin) => {
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    mutationOriginGuard('https://short.test')({ method: 'POST', cookies: { access_token: 'token' }, get: () => origin } as never, { status } as never, next);
    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
