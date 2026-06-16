import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
let auth: { status: string; user: { role: string } | null };
vi.mock('@iws/auth', () => ({ useAuth: () => auth }));

import RootPage from './page';

beforeEach(() => {
  replace.mockClear();
});

describe('RootPage redirect', () => {
  it('sends an authenticated user to /home (the staff app root)', () => {
    auth = { status: 'authenticated', user: { role: 'STAFF' } };
    render(<RootPage />);
    expect(replace).toHaveBeenCalledWith('/home');
  });

  it('sends an unauthenticated visitor to /login', () => {
    auth = { status: 'unauthenticated', user: null };
    render(<RootPage />);
    expect(replace).toHaveBeenCalledWith('/login');
  });
});
