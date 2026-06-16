// TODO(phase-6): replace tasks/notifications with the real API.
// Local sample data, NOT an API call — does not touch the Orval client.
import type { StatusTone } from '@iws/ui';

export const homeMock = {
  warehouse: 'West Coast Hub',
  tasks: [
    { title: 'Receive PO-2842', sub: 'Sony Corp · 320 units · Dock 3', badge: 'Due today', tone: 'warn' as StatusTone, href: '/receive' },
    { title: 'Dispatch SO-7741', sub: 'TechMart Retail · 4 items', badge: 'Pick list', tone: 'reserved' as StatusTone, href: '/dispatch' },
    { title: 'Count Aisle B-12', sub: '6 SKUs to verify', badge: 'In progress', tone: 'transit' as StatusTone, href: '/counting' },
    { title: 'Transfer TR-3918', sub: '200 units → Southeast', badge: 'Approved', tone: 'ok' as StatusTone, href: '/transfers' },
  ],
  notifications: ['Low stock: USB-C Cable', 'Low stock: Desk Mat', 'Transfer approval needed'],
};
