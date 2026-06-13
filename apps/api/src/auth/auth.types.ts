import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// What passport puts on request.user for the refresh strategy.
export interface RequestUserWithRefresh extends JwtPayload {
  refreshToken: string;
}

/**
 * The caller's resolved warehouse authorization scope.
 * `isGlobal` (Super Admin) → no filter; otherwise the explicit set of assigned
 * warehouse ids. An empty `warehouseIds` matches nothing (fail-closed).
 */
export type WarehouseScope =
  | { isGlobal: true }
  | { isGlobal: false; warehouseIds: string[] };

// Request augmented by ScopeGuard with the resolved warehouse scope.
export interface RequestWithScope extends Request {
  warehouseScope?: WarehouseScope;
}
