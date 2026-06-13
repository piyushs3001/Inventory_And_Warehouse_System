import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RequestWithScope, WarehouseScope } from '../auth.types';

export function scopeFromContext(ctx: ExecutionContext): WarehouseScope {
  const req = ctx.switchToHttp().getRequest<RequestWithScope>();
  if (!req.warehouseScope) {
    throw new ForbiddenException('Warehouse scope not resolved');
  }
  return req.warehouseScope;
}

/**
 * Injects the caller's resolved `WarehouseScope`. Requires `ScopeGuard` on the
 * route; throws (fail-closed) if the scope was never resolved.
 */
export const CurrentScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WarehouseScope =>
    scopeFromContext(ctx),
);
