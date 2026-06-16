import { describe, it, expect } from 'vitest';
import { roleLabel, pageLabel, NAV, builtHrefs } from './nav-config';
import { Role } from '@iws/api-client';

const staffNav = NAV.staff ?? [];

describe('nav-config (staff)', () => {
  it('roleLabel humanizes the enum', () => {
    expect(roleLabel(Role.STAFF)).toBe('Staff');
  });
  it('pageLabel matches a nav item, else humanizes the segment', () => {
    expect(pageLabel('/home', 'staff')).toBe('Home');
    expect(pageLabel('/receive', 'staff')).toBe('Receive Stock');
    expect(pageLabel('/inventory', 'staff')).toBe('View Inventory');
  });
  it('has the staff task groups', () => {
    const sections = staffNav.map((g) => g.section).filter(Boolean);
    expect(sections).toEqual(expect.arrayContaining(['My Tasks', 'Lookup']));
  });
  it('marks unbuilt items with a phase and built=false', () => {
    const receive = staffNav.flatMap((g) => g.items).find((i) => i.href === '/receive');
    expect(receive?.built).toBe(false);
    if (receive && !receive.built) {
      expect(receive.phase).toBeGreaterThan(0);
    }
  });
  it('Home is built and available to all roles', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/home');
  });
});
