import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Returns the userId if present (from OptionalJwtGuard), otherwise undefined.
 */
export const OptionalUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.userId;
  },
);
