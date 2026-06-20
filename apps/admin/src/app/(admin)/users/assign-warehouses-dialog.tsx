'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWarehousesControllerList } from '@iws/api-client';
import {
  useUsersControllerSetWarehouses,
  getUsersControllerFindAllQueryKey,
} from '@iws/api-client';
import type { UserDto } from '@iws/api-client';
import { Button } from '@iws/ui';
import { Checkbox, Label } from '@iws/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@iws/ui';

export function AssignWarehousesDialog({
  user,
  onClose,
}: {
  user: UserDto;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: warehouses } = useWarehousesControllerList();
  const setWarehouses = useUsersControllerSetWarehouses();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(user.warehouses.map((w) => w.id)),
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
    await setWarehouses.mutateAsync({ id: user.id, data: { warehouseIds: [...selected] } });
    await queryClient.invalidateQueries({ queryKey: getUsersControllerFindAllQueryKey() });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign warehouses — {user.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(warehouses ?? []).map((w) => (
            <div key={w.id} className="flex items-center gap-2">
              <Checkbox
                id={`wh-${w.id}`}
                checked={selected.has(w.id)}
                onCheckedChange={() => toggle(w.id)}
              />
              <Label htmlFor={`wh-${w.id}`} className="text-sm font-normal">
                {w.name}
              </Label>
            </div>
          ))}
          {!warehouses?.length && (
            <p className="text-sm text-muted-foreground">No warehouses.</p>
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
