import { describe, it, expect } from 'vitest';
import { initials } from './utils';

describe('initials', () => {
  it('takes first two name parts', () => {
    expect(initials('Rosa Martins')).toBe('RM');
    expect(initials('Jamal')).toBe('J');
  });

  it('handles more than two words by using only the first two', () => {
    expect(initials('Central Warehouse Main')).toBe('CW');
  });

  it('handles empty / whitespace-only string with a fallback', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});
