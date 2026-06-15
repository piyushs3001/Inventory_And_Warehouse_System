import { describe, it, expect } from 'vitest';
import { initials, roleLabel, pageLabel, NAV } from './nav-config';
import { Role } from '@/lib/api/generated/model';

describe('nav-config', () => {
  it('initials takes first two name parts', () => {
    expect(initials('Rosa Martins')).toBe('RM');
    expect(initials('Jamal')).toBe('J');
  });
  it('roleLabel humanizes the enum', () => {
    expect(roleLabel(Role.SUPER_ADMIN)).toBe('Super Admin');
  });
  it('pageLabel matches a nav item, else humanizes the segment', () => {
    expect(pageLabel('/admin/warehouses', 'admin')).toBe('Warehouses');
    expect(pageLabel('/admin/users/123', 'admin')).toBe('Users');
    expect(pageLabel('/home', 'staff')).toBe('Home');
  });
  it('admin nav Manage group has Users + Warehouses (SUPER_ADMIN only)', () => {
    const admin = NAV.admin.flatMap((g) => g.items);
    expect(admin.map((i) => i.label)).toEqual(['Users', 'Warehouses']);
    expect(admin.every((i) => i.roles.includes(Role.SUPER_ADMIN))).toBe(true);
  });
});
