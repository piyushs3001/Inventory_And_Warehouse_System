import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function ctxWithUser(role: Role | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(ctxWithUser(Role.STAFF))).toBe(true);
  });

  it('allows when the user role is permitted', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.SUPER_ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(ctxWithUser(Role.SUPER_ADMIN))).toBe(true);
  });

  it('forbids when the user role is not permitted', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.SUPER_ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(ctxWithUser(Role.STAFF))).toThrow();
  });
});
