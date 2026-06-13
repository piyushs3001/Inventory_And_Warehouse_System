import { ForbiddenException } from '@nestjs/common';
import { WarehouseScope } from './auth.types';
import { assertWarehouseInScope, warehouseFilter } from './scope.helpers';

const GLOBAL: WarehouseScope = { isGlobal: true };
const scoped = (...ids: string[]): WarehouseScope => ({
  isGlobal: false,
  warehouseIds: ids,
});

describe('warehouseFilter', () => {
  it('returns an empty filter for a global (Super Admin) scope', () => {
    expect(warehouseFilter(GLOBAL)).toEqual({});
  });

  it('filters on the assigned warehouse ids for a scoped caller', () => {
    expect(warehouseFilter(scoped('w1', 'w2'))).toEqual({
      warehouseId: { in: ['w1', 'w2'] },
    });
  });

  it('fails closed for an empty scope (matches nothing)', () => {
    expect(warehouseFilter(scoped())).toEqual({ warehouseId: { in: [] } });
  });

  it('supports a custom field name', () => {
    expect(warehouseFilter(scoped('w1'), 'sourceWarehouseId')).toEqual({
      sourceWarehouseId: { in: ['w1'] },
    });
  });
});

describe('assertWarehouseInScope', () => {
  it('allows any warehouse for a global scope', () => {
    expect(() => assertWarehouseInScope(GLOBAL, 'anything')).not.toThrow();
  });

  it('allows a warehouse inside the scoped set', () => {
    expect(() =>
      assertWarehouseInScope(scoped('w1', 'w2'), 'w2'),
    ).not.toThrow();
  });

  it('forbids a warehouse outside the scoped set', () => {
    expect(() => assertWarehouseInScope(scoped('w1'), 'w2')).toThrow(
      ForbiddenException,
    );
  });

  it('fails closed for an empty scope', () => {
    expect(() => assertWarehouseInScope(scoped(), 'w1')).toThrow(
      ForbiddenException,
    );
  });
});
