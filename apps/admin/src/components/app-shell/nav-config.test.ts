import { describe, it, expect } from 'vitest';
import { roleLabel, pageLabel, NAV, builtHrefs } from './nav-config';
import { Role } from '@iws/api-client';

const adminNav = NAV.admin ?? [];

describe('nav-config (admin)', () => {
  it('roleLabel humanizes the enum', () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe('Super Admin');
  });
  it('pageLabel matches a nav item, else humanizes the segment', () => {
    expect(pageLabel('/warehouses', 'admin')).toBe('Warehouses');
    expect(pageLabel('/users/123', 'admin')).toBe('Users');
    expect(pageLabel('/', 'admin')).toBe('Dashboard');
  });
  it('Manage group has exactly Users (SUPER_ADMIN only)', () => {
    const manageGroup = adminNav.find((g) => g.section === 'Manage');
    expect(manageGroup).toBeDefined();
    const labels = manageGroup!.items.map((i) => i.label);
    expect(labels).toEqual(['Users']);
    expect(manageGroup!.items.every((i) => i.roles.includes(Role.SUPER_ADMIN))).toBe(true);
  });
  it('has the Stockpilot groups', () => {
    const sections = adminNav.map((g) => g.section);
    expect(sections).toEqual(
      expect.arrayContaining(['Operations', 'Purchasing', 'Logistics', 'Analytics', 'AI Center']),
    );
  });
  it('marks unbuilt items with a phase and built=false (root hrefs)', () => {
    const inventory = adminNav.flatMap((g) => g.items).find((i) => i.href === '/inventory');
    expect(inventory?.built).toBe(false);
    if (inventory && !inventory.built) {
      expect(inventory.phase).toBeGreaterThan(0);
    }
  });
  it('Dashboard (/) and Users (/users) are built', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/');
    expect(built).toContain('/users');
  });
});
