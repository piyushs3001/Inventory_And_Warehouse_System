import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { JwtPayload, WarehouseScope } from './auth.types';

@Injectable()
export class ScopeService {
  constructor(private readonly users: UsersService) {}

  /**
   * Resolve the caller's warehouse scope from the authenticated principal.
   * Super Admin is global; every other role is restricted to its assigned
   * warehouses (a Supplier or unassigned user resolves to an empty,
   * fail-closed set). Never derive scope from client input.
   */
  async resolve(user: JwtPayload): Promise<WarehouseScope> {
    if (user.role === Role.SUPER_ADMIN) {
      return { isGlobal: true };
    }
    const warehouseIds = await this.users.getWarehouseScope(user.sub);
    return { isGlobal: false, warehouseIds };
  }
}
