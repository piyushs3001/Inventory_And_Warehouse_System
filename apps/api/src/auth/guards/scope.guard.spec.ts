import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ScopeService } from '../scope.service';
import { JwtPayload, RequestWithScope, WarehouseScope } from '../auth.types';
import { ScopeGuard } from './scope.guard';

function ctxWithRequest(req: Partial<RequestWithScope>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

const user: JwtPayload = { sub: 'u1', email: 'u1@iws.local', role: Role.STAFF };

describe('ScopeGuard', () => {
  it('resolves the caller scope and attaches it to the request', async () => {
    const resolved: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };
    const scope = { resolve: jest.fn().mockResolvedValue(resolved) };
    const guard = new ScopeGuard(scope as unknown as ScopeService);
    const req: Partial<RequestWithScope> = { user };

    await expect(guard.canActivate(ctxWithRequest(req))).resolves.toBe(true);
    expect(scope.resolve).toHaveBeenCalledWith(user);
    expect(req.warehouseScope).toEqual(resolved);
  });

  it('fails closed (403) when no authenticated principal is present', async () => {
    const scope = { resolve: jest.fn() };
    const guard = new ScopeGuard(scope as unknown as ScopeService);

    await expect(
      guard.canActivate(ctxWithRequest({ user: undefined })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(scope.resolve).not.toHaveBeenCalled();
  });
});
