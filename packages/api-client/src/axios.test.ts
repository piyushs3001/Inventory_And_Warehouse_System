import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE, customInstance } from './axios';
import { tokenStore } from './token-store';

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(AXIOS_INSTANCE);
  tokenStore.set({ accessToken: 'old-access', refreshToken: 'good-refresh' });
});
afterEach(() => {
  mock.restore();
  tokenStore.clear();
});

describe('axios mutator', () => {
  it('attaches the access token', async () => {
    mock.onGet('/ping').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer old-access');
      return [200, { ok: true }];
    });
    await customInstance({ url: '/ping', method: 'GET' });
  });

  it('refreshes once on 401 and retries the original request with new token', async () => {
    let calls = 0;
    mock.onGet('/secure').reply((config) => {
      calls += 1;
      if (calls === 1) return [401, {}];
      // On the retry the interceptor must have attached the new access token.
      expect(config.headers?.Authorization).toBe('Bearer new-access');
      return [200, { ok: true }];
    });
    mock.onPost('/auth/refresh').reply(200, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const data = await customInstance<{ ok: boolean }>({ url: '/secure', method: 'GET' });
    expect(data.ok).toBe(true);
    expect(tokenStore.getAccess()).toBe('new-access');
  });

  it('dispatches iws:logout when refresh fails', async () => {
    const onLogout = vi.fn();
    window.addEventListener('iws:logout', onLogout);
    mock.onGet('/secure').reply(401);
    mock.onPost('/auth/refresh').reply(401);

    await expect(customInstance({ url: '/secure', method: 'GET' })).rejects.toBeDefined();
    expect(onLogout).toHaveBeenCalled();
    window.removeEventListener('iws:logout', onLogout);
  });

  it('dispatches iws:logout when retried request still 401s', async () => {
    const onLogout = vi.fn();
    window.addEventListener('iws:logout', onLogout);
    // Refresh succeeds but the retried request returns 401 again.
    mock.onGet('/secure').reply(401);
    mock.onPost('/auth/refresh').reply(200, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(customInstance({ url: '/secure', method: 'GET' })).rejects.toBeDefined();
    expect(onLogout).toHaveBeenCalled();
    window.removeEventListener('iws:logout', onLogout);
  });

  it('single-flights concurrent 401s — refresh called exactly once', async () => {
    // Both GETs will 401 on their first call, then succeed after refresh.
    let secureCallCount = 0;
    mock.onGet('/secure').reply(() => {
      secureCallCount += 1;
      // First two calls (the concurrent originals) 401; subsequent retries succeed.
      return secureCallCount <= 2 ? [401, {}] : [200, { ok: true }];
    });
    mock.onPost('/auth/refresh').reply(200, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    // Fire two concurrent requests without awaiting either first.
    const [r1, r2] = await Promise.all([
      customInstance<{ ok: boolean }>({ url: '/secure', method: 'GET' }),
      customInstance<{ ok: boolean }>({ url: '/secure', method: 'GET' }),
    ]);

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);

    // Refresh must have been called exactly once despite two concurrent 401s.
    const refreshCalls = mock.history.post.filter((r) => r.url === '/auth/refresh');
    expect(refreshCalls).toHaveLength(1);
  });
});
