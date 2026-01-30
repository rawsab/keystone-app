import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../jwt.strategy';

/**
 * Decorator to extract current authenticated user from request
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
