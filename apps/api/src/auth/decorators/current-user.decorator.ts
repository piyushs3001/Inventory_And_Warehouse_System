import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload, RequestUserWithRefresh } from '../auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | RequestUserWithRefresh => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.user as JwtPayload | RequestUserWithRefresh;
  },
);
