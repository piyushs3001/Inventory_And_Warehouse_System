// TODO(phase-6): replace every figure here with the real reports/dashboard API.
// This is local sample data, NOT an API call — it does not touch the Orval client.
export const dashboardMock = {
  kpis: [
    { label: 'Total Products', value: '2,847', delta: { dir: 'up' as const, text: '+4.2% vs last mo' } },
    { label: 'Inventory Value', value: '$4.82M', delta: { dir: 'up' as const, text: '+8.1% vs last mo' } },
    { label: 'Active Warehouses', value: '6', delta: { dir: 'flat' as const, text: 'Stable' } },
    { label: 'Low Stock Alerts', value: '23', delta: { dir: 'down' as const, text: '+5 this week' } },
    { label: 'Pending POs', value: '14', delta: { dir: 'flat' as const, text: '−2 vs last wk' } },
    { label: 'Revenue Impact', value: '+$312K', delta: { dir: 'up' as const, text: '+12.4% MTD' } },
  ],
  valueTrend: [3.9, 4.1, 4.0, 4.35, 4.6, 4.82],
  utilization: [
    { name: 'West Coast Hub', pct: 92 },
    { name: 'Midwest DC', pct: 78 },
    { name: 'Southeast', pct: 64 },
    { name: 'Northeast', pct: 88 },
    { name: 'Texas', pct: 71 },
    { name: 'Pacific NW', pct: 55 },
  ],
  poWeeks: [4, 8, 6, 10, 7, 9],
  topProducts: [
    { name: 'Wireless Mouse', pct: 90 },
    { name: 'USB-C Cable', pct: 76 },
    { name: 'Laptop Stand', pct: 61 },
    { name: 'Desk Mat', pct: 48 },
  ],
  activity: [
    { actor: 'Receiving clerk', action: 'received 320 units · PO-2842', time: '2m ago', tone: 'ok' as const },
    { actor: 'Warehouse manager', action: 'approved Transfer TR-3918', time: '1h ago', tone: 'transit' as const },
    { actor: 'System', action: 'low-stock alert · USB-C Cable', time: '3h ago', tone: 'warn' as const },
  ],
  recommendations: [
    'Reorder USB-C Cable — projected stock-out in 6 days.',
    'Rebalance West Coast Hub (92% capacity) to Pacific NW (55%).',
  ],
  deliveries: [
    { date: 'Jun 17', supplier: 'Sony Corp', po: 'PO-2842' },
    { date: 'Jun 19', supplier: 'TechMart', po: 'PO-2851' },
  ],
};
