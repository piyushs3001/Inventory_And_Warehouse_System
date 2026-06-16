'use client';

import { useState } from 'react';
import { useWarehousesControllerAssignStaff } from '@iws/api-client';
import { useUsersControllerFindAll } from '@iws/api-client';
import type { WarehouseDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@iws/ui';

export function AssignStaffDialog({
  warehouse,
  currentStaffIds,
  onClose,
  onSuccess,
}: {
  warehouse: WarehouseDto;
  currentStaffIds: string[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const { data: users } = useUsersControllerFindAll();
  const assignStaff = useWarehousesControllerAssignStaff();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(currentStaffIds),
  );

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSave = async (): Promise<void> => {
    await assignStaff.mutateAsync({ id: warehouse.id, data: { userIds: [...selected] } });
    await onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign staff — {warehouse.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(users ?? []).map((u) => (
            <label key={u.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={u.name}
                checked={selected.has(u.id)}
                onChange={() => toggle(u.id)}
              />
              <span>{u.name}</span>
              <span className="text-xs text-muted-foreground">{u.email}</span>
            </label>
          ))}
          {!users?.length && (
            <p className="text-sm text-muted-foreground">No users available.</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
