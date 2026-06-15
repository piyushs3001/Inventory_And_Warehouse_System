import { Home, Users, Warehouse, type LucideIcon } from 'lucide-react';
import { Role } from '@/lib/api/generated/model';

export type Surface = 'staff' | 'admin';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}
export interface NavGroup {
  section?: string;
  items: NavItem[];
}

const ALL_ROLES: Role[] = [Role.STAFF, Role.WAREHOUSE_MANAGER, Role.SUPER_ADMIN];

export const NAV: Record<Surface, NavGroup[]> = {
  staff: [
    { items: [{ href: '/home', label: 'Home', icon: Home, roles: ALL_ROLES }] },
    // Future phases: Catalog, Inventory, Receiving, Transfers, Count, Assistant
  ],
  admin: [
    {
      section: 'Manage',
      items: [
        { href: '/admin/users', label: 'Users', icon: Users, roles: [Role.SUPER_ADMIN] },
        { href: '/admin/warehouses', label: 'Warehouses', icon: Warehouse, roles: [Role.SUPER_ADMIN] },
      ],
    },
    // Future groups: Operations (POs, Transfers, Counts, Movements), Insights (Dashboard, Reports, Activity Log), AI
  ],
};

export const SURFACE_LABEL: Record<Surface, string> = {
  staff: 'Staff App',
  admin: 'Admin Portal',
};

const ROLE_LABEL: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super Admin',
  [Role.WAREHOUSE_MANAGER]: 'Warehouse Manager',
  [Role.STAFF]: 'Staff',
  [Role.SUPPLIER]: 'Supplier',
};
export function roleLabel(role: Role): string {
  return ROLE_LABEL[role] ?? role;
}

export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return out || '?';
}

/** Breadcrumb page label: match a nav item by path, else humanize the last segment. */
export function pageLabel(pathname: string, surface: Surface): string {
  const items = NAV[surface].flatMap((g) => g.items);
  const match = items.find((it) => pathname === it.href || pathname.startsWith(it.href + '/'));
  if (match) return match.label;
  const seg = pathname.split('/').filter(Boolean).pop() ?? '';
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Home';
}
