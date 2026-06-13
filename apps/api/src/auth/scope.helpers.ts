import { ForbiddenException } from '@nestjs/common';
import { WarehouseScope } from './auth.types';

/**
 * Build a Prisma `where` fragment that restricts a warehouse-bound query to the
 * caller's scope. Global scope → `{}` (no restriction); otherwise an
 * `in` filter over the assigned ids (empty set matches nothing → fail-closed).
 * Spread the result into a query `where`, e.g. `where: { ...warehouseFilter(scope), ... }`.
 */
export function warehouseFilter(
  scope: WarehouseScope,
  field = 'warehouseId',
): Record<string, unknown> {
  if (scope.isGlobal) return {};
  return { [field]: { in: scope.warehouseIds } };
}

/**
 * Assert a single warehouse id is within the caller's scope, else throw 403.
 * Use on writes where the target warehouse comes from a DTO/route param; for
 * reads prefer `warehouseFilter` so out-of-scope rows simply don't exist.
 */
export function assertWarehouseInScope(
  scope: WarehouseScope,
  warehouseId: string,
): void {
  if (scope.isGlobal) return;
  if (!scope.warehouseIds.includes(warehouseId)) {
    throw new ForbiddenException('Warehouse outside your scope');
  }
}
