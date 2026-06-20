import { PurchaseOrderStatus } from '@iws/api-client';
import type { StatusTone } from '@iws/ui';

export const PO_STATUS_TONE: Record<PurchaseOrderStatus, StatusTone> = {
  [PurchaseOrderStatus.DRAFT]: 'muted',
  [PurchaseOrderStatus.SENT]: 'brand',
  [PurchaseOrderStatus.APPROVED]: 'transit',
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: 'warn',
  [PurchaseOrderStatus.COMPLETED]: 'ok',
  [PurchaseOrderStatus.CANCELLED]: 'danger',
};
