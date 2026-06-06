import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { AXIOS_INSTANCE, customInstance } from './axios';
import { tokenStore } from '../auth/token-store';

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

  it('refreshes once on 401 and retries the original request', async () => {
    let calls = 0;
    mock.onGet('/secure').reply(() => {
      calls += 1;
      return calls === 1 ? [401, {}] : [200, { ok: true }];
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
});
