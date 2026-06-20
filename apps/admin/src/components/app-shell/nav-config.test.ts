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
  it('every admin nav item is built (all phases complete)', () => {
    expect(adminNav.flatMap((g) => g.items).every((i) => i.built)).toBe(true);
  });
  it('AI Assistant is built (phase 7, manager + admin)', () => {
    const built = builtHrefs('admin', Role.WAREHOUSE_MANAGER);
    expect(built).toContain('/ai');
  });
  it('Reports and Activity Log are built (phase 6)', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/reports');
    expect(built).toContain('/activity');
    expect(built).toContain('/notifications');
  });
  it('Stock Transfers and Counting are built (phase 5)', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/transfers');
    expect(built).toContain('/counting');
  });
  it('Inventory and Movements are built (phase 3)', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/inventory');
    expect(built).toContain('/movements');
  });
  it('Purchase Orders and Suppliers are built (phase 4)', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/purchase-orders');
    expect(built).toContain('/suppliers');
  });
  it('Dashboard (/) and Users (/users) are built', () => {
    const built = builtHrefs('admin', Role.SUPER_ADMIN);
    expect(built).toContain('/');
    expect(built).toContain('/users');
  });
});
