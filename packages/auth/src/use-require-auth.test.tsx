import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
let auth: { status: string; user: { role: string } | null };
vi.mock('./auth-context', () => ({ useAuth: () => auth }));

import { useRequireAuth } from './use-require-auth';

beforeEach(() => { replace.mockClear(); });

describe('useRequireAuth', () => {
  it('redirects to /login when unauthenticated', () => {
    auth = { status: 'unauthenticated', user: null };
    renderHook(() => useRequireAuth());
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('sends a denied role back to this app\'s /login (no cross-app bounce)', () => {
    auth = { status: 'authenticated', user: { role: 'STAFF' } };
    renderHook(() => useRequireAuth({ roles: ['SUPER_ADMIN'] }));
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect an allowed role', () => {
    auth = { status: 'authenticated', user: { role: 'SUPER_ADMIN' } };
    renderHook(() => useRequireAuth({ roles: ['SUPER_ADMIN'] }));
    expect(replace).not.toHaveBeenCalled();
  });
});
