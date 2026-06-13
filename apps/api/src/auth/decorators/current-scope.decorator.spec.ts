import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequestWithScope, WarehouseScope } from '../auth.types';
import { scopeFromContext } from './current-scope.decorator';

function ctxWithRequest(req: Partial<RequestWithScope>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('scopeFromContext', () => {
  it('returns the scope attached by ScopeGuard', () => {
    const scope: WarehouseScope = { isGlobal: false, warehouseIds: ['w1'] };
    expect(scopeFromContext(ctxWithRequest({ warehouseScope: scope }))).toEqual(
      scope,
    );
  });

  it('fails closed when no scope was resolved (guard missing)', () => {
    expect(() => scopeFromContext(ctxWithRequest({}))).toThrow(
      ForbiddenException,
    );
  });
});
