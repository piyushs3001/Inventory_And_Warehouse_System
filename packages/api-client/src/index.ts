// @iws/api-client — the generated API client + axios transport + token store.
// The contract flow is Swagger → Orval; `generated/` is regenerated wholesale
// (clean: true) by `npm run client`. Do not hand-edit `generated/`.
export * from './generated/auth/auth';
export * from './generated/users/users';
export * from './generated/warehouses/warehouses';
export * from './generated/categories/categories';
export * from './generated/products/products';
export * from './generated/variants/variants';
export * from './generated/inventory/inventory';
export * from './generated/movements/movements';
export * from './generated/suppliers/suppliers';
export * from './generated/purchase-orders/purchase-orders';
export * from './generated/receipts/receipts';
export * from './generated/transfers/transfers';
export * from './generated/stock-counts/stock-counts';
export * from './generated/dashboard/dashboard';
export * from './generated/reports/reports';
export * from './generated/notifications/notifications';
export * from './generated/activity-logs/activity-logs';
export * from './generated/ai/ai';
export * from './generated/health/health';
export * from './generated/model';
export * from './axios';
export * from './token-store';
export * from './jwt';
