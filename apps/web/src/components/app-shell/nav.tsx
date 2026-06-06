'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type Role, Role as RoleConst } from '@/lib/api/generated/model';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const ITEMS: NavItem[] = [
  { href: '/home', label: 'Home', roles: [RoleConst.STAFF, RoleConst.WAREHOUSE_MANAGER, RoleConst.SUPER_ADMIN] },
  { href: '/users', label: 'Users', roles: [RoleConst.SUPER_ADMIN] },
];

export function Nav({ role }: { role: Role }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'rounded px-3 py-2 text-sm hover:bg-accent',
            pathname.startsWith(item.href) && 'bg-accent font-medium',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
