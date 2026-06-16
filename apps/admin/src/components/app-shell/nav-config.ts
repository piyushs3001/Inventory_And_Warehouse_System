import {
  LayoutDashboard, Package, Tag, Warehouse, ShoppingCart, ArrowRightLeft,
  ClipboardList, BarChart3, Sparkles, Users, type LucideIcon,
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

const ADMIN_ONLY: Role[] = [Role.SUPER_ADMIN];
const MGR_UP: Role[] = [Role.WAREHOUSE_MANAGER, Role.SUPER_ADMIN];

// Admin Portal nav — this app serves the admin routes at the ROOT (no /admin prefix).
export const NAV: Partial<Record<Surface, NavGroup[]>> = {
  admin: [
    { items: [{ href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ADMIN_ONLY, built: true }] },
    {
      section: 'Operations',
      items: [
        { href: '/inventory', label: 'Inventory', icon: Package, roles: MGR_UP, built: false, phase: 3 },
        { href: '/products', label: 'Products', icon: Tag, roles: MGR_UP, built: false, phase: 2 },
        { href: '/warehouses', label: 'Warehouses', icon: Warehouse, roles: ADMIN_ONLY, built: true },
      ],
    },
    {
      section: 'Purchasing',
      items: [{ href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: MGR_UP, built: false, phase: 4, badge: 14 }],
    },
    {
      section: 'Logistics',
      items: [
        { href: '/transfers', label: 'Stock Transfers', icon: ArrowRightLeft, roles: MGR_UP, built: false, phase: 5 },
        { href: '/counting', label: 'Stock Counting', icon: ClipboardList, roles: MGR_UP, built: false, phase: 5 },
      ],
    },
    {
      section: 'Analytics',
      items: [{ href: '/reports', label: 'Reports', icon: BarChart3, roles: MGR_UP, built: false, phase: 6 }],
    },
    {
      section: 'AI Center',
      items: [{ href: '/ai', label: 'AI Assistant', icon: Sparkles, roles: ADMIN_ONLY, built: false, phase: 7 }],
    },
    {
      section: 'Manage',
      items: [{ href: '/users', label: 'Users', icon: Users, roles: ADMIN_ONLY, built: true }],
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
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Dashboard';
}
