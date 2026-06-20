import { StockCountStatus } from '@iws/api-client';
import type { StatusTone } from '@iws/ui';

export const COUNT_STATUS_TONE: Record<StockCountStatus, StatusTone> = {
  [StockCountStatus.OPEN]: 'warn',
  [StockCountStatus.RECONCILED]: 'ok',
  [StockCountStatus.CANCELLED]: 'danger',
};
