'use client';

import { Inbox } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHead } from '@/components/ui/page-head';
import { EmptyState } from '@/components/ui/empty-state';

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div>
      <PageHead
        title={`Welcome, ${user?.name ?? ''}`.trim()}
        description="Here's your workspace. Operational widgets arrive in a later phase."
      />
      <EmptyState
        icon={<Inbox className="size-5" aria-hidden />}
        title="Your dashboard is coming soon"
        description="Stock summaries, low-stock alerts, and pending tasks will appear here once the dashboard ships."
      />
    </div>
  );
}
