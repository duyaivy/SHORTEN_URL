import { Request, Response, NextFunction } from 'express';

export function clientOrigin(clientUrl: string | undefined): string {
  if (!clientUrl) throw new Error('CLIENT_URL is required for credentialed CORS and CSRF protection');
  return new URL(clientUrl).origin;
}

export function mutationOriginGuard(allowedOrigin: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const hasCookies = Object.hasOwn(req.cookies ?? {}, 'access_token') ||
      Object.hasOwn(req.cookies ?? {}, 'refresh_token');
    // Browsers send Origin on mutations. Reject foreign origins even without cookies
    // (login CSRF), and fail closed for cookie mutations without an Origin.
    if ((origin && origin !== allowedOrigin) || (!origin && hasCookies)) {
      return res.status(403).json({ success: false, message: 'Untrusted request origin', data: null, statusCode: 403 });
    }
    next();
  };
}
