'use client';

import * as React from 'react';
import { EyeIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { cn } from '../../utils';
import { Button, buttonVariants } from './button';

type RowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewHref?: string;
  editHref?: string;
  labels?: { view?: string; edit?: string; delete?: string };
  deleteDisabled?: boolean;
};

const ICON_BTN = buttonVariants({ variant: 'ghost', size: 'icon-sm' });

export function RowActions({
  onView,
  onEdit,
  onDelete,
  viewHref,
  editHref,
  labels,
  deleteDisabled,
}: RowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {(viewHref || onView) &&
        (viewHref ? (
          <a aria-label={labels?.view ?? 'View'} href={viewHref} className={cn(ICON_BTN, 'hover:text-foreground')}>
            <EyeIcon />
          </a>
        ) : (
          <Button aria-label={labels?.view ?? 'View'} variant="ghost" size="icon-sm" onClick={onView}>
            <EyeIcon />
          </Button>
        ))}
      {(editHref || onEdit) &&
        (editHref ? (
          <a aria-label={labels?.edit ?? 'Edit'} href={editHref} className={cn(ICON_BTN, 'hover:bg-primary-tint hover:text-primary')}>
            <PencilIcon />
          </a>
        ) : (
          <Button aria-label={labels?.edit ?? 'Edit'} variant="ghost" size="icon-sm" className="hover:bg-primary-tint hover:text-primary" onClick={onEdit}>
            <PencilIcon />
          </Button>
        ))}
      {onDelete && (
        <Button
          aria-label={labels?.delete ?? 'Delete'}
          variant="ghost"
          size="icon-sm"
          disabled={deleteDisabled}
          className="hover:bg-danger-tint hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      )}
    </div>
  );
}
