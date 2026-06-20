import { StockTransferStatus } from '@iws/api-client';
import type { StatusTone } from '@iws/ui';

export const TRANSFER_STATUS_TONE: Record<StockTransferStatus, StatusTone> = {
  [StockTransferStatus.REQUESTED]: 'warn',
  [StockTransferStatus.APPROVED]: 'transit',
  [StockTransferStatus.COMPLETED]: 'ok',
  [StockTransferStatus.CANCELLED]: 'danger',
};
