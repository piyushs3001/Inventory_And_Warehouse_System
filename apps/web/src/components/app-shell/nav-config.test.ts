import { describe, it, expect } from 'vitest';
import { roleLabel, pageLabel, NAV, builtHrefs } from './nav-config';
import { Role } from '@/lib/api/generated/model';

describe('nav-config', () => {
  it('roleLabel humanizes the enum', () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe('Super Admin');
  });
  it('pageLabel matches a nav item, else humanizes the segment', () => {
    expect(pageLabel('/admin/warehouses', 'admin')).toBe('Warehouses');
    expect(pageLabel('/admin/users/123', 'admin')).toBe('Users');
    expect(pageLabel('/home', 'staff')).toBe('Home');
  });
  it('admin nav Manage group has exactly Users (SUPER_ADMIN only)', () => {
    const manageGroup = NAV.admin.find((g) => g.section === 'Manage');
    expect(manageGroup).toBeDefined();
    const labels = manageGroup!.items.map((i) => i.label);
    expect(labels).toEqual(['Users']);
    expect(manageGroup!.items.every((i) => i.roles.includes(Role.SUPER_ADMIN))).toBe(true);
  });
});

describe('NAV (stockpilot)', () => {
  it('admin nav has the Stockpilot groups', () => {
    const sections = NAV.admin.map((g) => g.section);
    expect(sections).toEqual(
      expect.arrayContaining(['Operations', 'Purchasing', 'Logistics', 'Analytics', 'AI Center']),
    );
  });

  it('marks unbuilt items with a phase and built=false', () => {
    const inventory = NAV.admin.flatMap((g) => g.items).find((i) => i.href === '/admin/inventory');
    expect(inventory?.built).toBe(false);
    if (inventory && !inventory.built) {
      expect(inventory.phase).toBeGreaterThan(0);
    }
  });

  it('Dashboard and Users are built', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/admin');
    expect(built).toContain('/admin/users');
  });
});
