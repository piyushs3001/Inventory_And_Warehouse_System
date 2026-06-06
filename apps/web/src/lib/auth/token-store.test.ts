import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStore } from './token-store';

describe('tokenStore', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStore.clear();
  });

  it('returns nulls when empty', () => {
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it('persists tokens to localStorage and reads them back', () => {
    tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    expect(tokenStore.getAccess()).toBe('a');
    expect(tokenStore.getRefresh()).toBe('r');
    expect(localStorage.getItem('iws.tokens')).toContain('a');
  });

  it('clear() wipes memory and storage', () => {
    tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    tokenStore.clear();
    expect(tokenStore.getAccess()).toBeNull();
    expect(localStorage.getItem('iws.tokens')).toBeNull();
  });

  it('hydrate() reloads from storage into memory', () => {
    localStorage.setItem('iws.tokens', JSON.stringify({ accessToken: 'x', refreshToken: 'y' }));
    tokenStore.hydrate();
    expect(tokenStore.getAccess()).toBe('x');
  });
});
