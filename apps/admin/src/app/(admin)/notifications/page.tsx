'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  useNotificationsControllerList,
  useNotificationsControllerMarkRead,
  getNotificationsControllerListQueryKey,
} from '@iws/api-client';
import { PageHead, Button, Skeleton, EmptyState, StatusBadge } from '@iws/ui';

export default function NotificationsPage() {
  const params = {};
  const { data, isLoading } = useNotificationsControllerList(params);
  const markRead = useNotificationsControllerMarkRead();
  const queryClient = useQueryClient();
  const list = data ?? [];

  const onRead = async (id: string): Promise<void> => {
    await markRead.mutateAsync({ id });
    await queryClient.invalidateQueries({
      queryKey: getNotificationsControllerListQueryKey(params),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Notifications" />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="All caught up" description="You have no notifications." />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 ${n.read ? 'opacity-60' : ''}`}
            >
              <StatusBadge tone={n.type === 'LOW_STOCK' ? 'warn' : 'brand'}>{n.type}</StatusBadge>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-0.5 font-mono text-[11px] text-faint">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && (
                <Button variant="outline" size="sm" disabled={markRead.isPending} onClick={() => onRead(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
