import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
}

interface RequestWithUser extends Request {
  user: RequestUser;
}

// Lets a protected route write `@CurrentUser() user: RequestUser` instead of
// reaching into `req.user` (which JwtStrategy.validate() populates) by hand.
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
