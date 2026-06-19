import {
  Package, ShoppingCart, ArrowRightLeft, ClipboardList, Home, Truck, Tag, type LucideIcon,
} from 'lucide-react';
import { Role } from '@iws/api-client';

export type Surface = 'staff' | 'admin';

export type NavItem =
  | { href: string; label: string; icon: LucideIcon; roles: Role[]; built: true; badge?: number }
  | { href: string; label: string; icon: LucideIcon; roles: Role[]; built: false; phase: number; badge?: number };
export interface NavGroup {
  section?: string;
  items: NavItem[];
}

const ALL_ROLES: Role[] = [Role.STAFF, Role.WAREHOUSE_MANAGER, Role.SUPER_ADMIN];

// Staff app nav. (The Admin Portal's nav lives in the admin app.)
export const NAV: Partial<Record<Surface, NavGroup[]>> = {
  staff: [
    { items: [{ href: '/home', label: 'Home', icon: Home, roles: ALL_ROLES, built: true }] },
    {
      section: 'My Tasks',
      items: [
        { href: '/receive', label: 'Receive Stock', icon: Truck, roles: ALL_ROLES, built: false, phase: 4, badge: 2 },
        { href: '/dispatch', label: 'Dispatch Stock', icon: ShoppingCart, roles: ALL_ROLES, built: false, phase: 4, badge: 5 },
        { href: '/transfers', label: 'Stock Transfers', icon: ArrowRightLeft, roles: ALL_ROLES, built: false, phase: 5 },
        { href: '/counting', label: 'Stock Count', icon: ClipboardList, roles: ALL_ROLES, built: false, phase: 5 },
      ],
    },
    {
      section: 'Lookup',
      items: [
        { href: '/catalog', label: 'Catalog', icon: Tag, roles: ALL_ROLES, built: true },
        { href: '/inventory', label: 'View Inventory', icon: Package, roles: ALL_ROLES, built: false, phase: 3 },
      ],
    },
  ],
};

export function builtHrefs(surface: Surface, role: Role): string[] {
  return (NAV[surface] ?? [])
    .flatMap((g) => g.items)
    .filter((i) => i.built && i.roles.includes(role))
    .map((i) => i.href);
}

export const SURFACE_LABEL: Record<Surface, string> = {
  staff: 'Staff App',
  admin: 'Admin Portal',
};

/** Short surface label for the topbar breadcrumb (the full label lives in the sidebar brand mark). */
export const SURFACE_CRUMB: Record<Surface, string> = {
  staff: 'Staff',
  admin: 'Admin',
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

/** Breadcrumb page label: match a nav item by path, else humanize the last segment. */
export function pageLabel(pathname: string, surface: Surface): string {
  const items = (NAV[surface] ?? []).flatMap((g) => g.items);
  const exact = items.find((it) => pathname === it.href);
  if (exact) return exact.label;
  const prefix = items
    .filter((it) => it.href !== '/' && pathname.startsWith(it.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (prefix) return prefix.label;
  const seg = pathname.split('/').filter(Boolean).pop() ?? '';
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Home';
}
