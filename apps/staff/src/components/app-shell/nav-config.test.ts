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
    const dispatch = staffNav.flatMap((g) => g.items).find((i) => i.href === '/dispatch');
    expect(dispatch?.built).toBe(false);
    if (dispatch && !dispatch.built) {
      expect(dispatch.phase).toBeGreaterThan(0);
    }
  });
  it('Stock Transfers and Stock Count are built (phase 5)', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/transfers');
    expect(built).toContain('/counting');
  });
  it('Receive Stock is built (phase 4)', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/receive');
  });
  it('Home is built and available to all roles', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/home');
  });
  it('View Inventory and Movement History are built (phase 3)', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/inventory');
    expect(built).toContain('/movements');
  });
  it('Notifications is built (phase 6)', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/notifications');
  });
  it('Assistant is built (phase 7)', () => {
    const built = builtHrefs('staff', Role.STAFF);
    expect(built).toContain('/ai');
  });
});
