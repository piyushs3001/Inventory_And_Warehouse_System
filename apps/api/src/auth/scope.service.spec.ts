import { Role } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './auth.types';
import { ScopeService } from './scope.service';

const payload = (role: Role): JwtPayload => ({
  sub: 'u1',
  email: 'u1@iws.local',
  role,
});

function makeService(scope: string[] = []) {
  const users = { getWarehouseScope: jest.fn().mockResolvedValue(scope) };
  const service = new ScopeService(users as unknown as UsersService);
  return { service, users };
}

describe('ScopeService.resolve', () => {
  it('resolves Super Admin to a global scope without querying assignments', async () => {
    const { service, users } = makeService();
    await expect(service.resolve(payload(Role.SUPER_ADMIN))).resolves.toEqual({
      isGlobal: true,
    });
    expect(users.getWarehouseScope).not.toHaveBeenCalled();
  });

  it('resolves a Warehouse Manager to their assigned warehouse ids', async () => {
    const { service, users } = makeService(['w1', 'w2']);
    await expect(
      service.resolve(payload(Role.WAREHOUSE_MANAGER)),
    ).resolves.toEqual({ isGlobal: false, warehouseIds: ['w1', 'w2'] });
    expect(users.getWarehouseScope).toHaveBeenCalledWith('u1');
  });

  it('resolves Staff to their assigned warehouse ids', async () => {
    const { service } = makeService(['w3']);
    await expect(service.resolve(payload(Role.STAFF))).resolves.toEqual({
      isGlobal: false,
      warehouseIds: ['w3'],
    });
  });

  it('resolves a Supplier (no assignments) to an empty fail-closed scope', async () => {
    const { service } = makeService([]);
    await expect(service.resolve(payload(Role.SUPPLIER))).resolves.toEqual({
      isGlobal: false,
      warehouseIds: [],
    });
  });
});
