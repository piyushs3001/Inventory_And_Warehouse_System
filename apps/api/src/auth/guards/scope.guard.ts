import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload, RequestWithScope } from '../auth.types';
import { ScopeService } from '../scope.service';

/**
 * Resolves the caller's warehouse scope and attaches it to the request as
 * `warehouseScope`, for handlers/services to consume via `@CurrentScope()` or
 * the scope helpers. Apply AFTER `JwtAccessGuard` (which sets `req.user`), e.g.
 * `@UseGuards(JwtAccessGuard, RolesGuard, ScopeGuard)`. Fails closed if no
 * authenticated principal is present.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly scope: ScopeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithScope>();
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      throw new ForbiddenException('Missing authenticated principal');
    }
    req.warehouseScope = await this.scope.resolve(user);
    return true;
  }
}
