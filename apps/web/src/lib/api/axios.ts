// CLIENT-ONLY MODULE
// This file holds client-side singletons (the `refreshing` promise and the
// in-memory token store) and must only be used in the browser / client
// components. Do NOT import this in Server Actions or Route Handlers — use a
// plain fetch/server-side credential store there instead.

import Axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '../auth/token-store';

// Augment axios's built-in InternalAxiosRequestConfig so we can read and set
// our custom flags without any casts throughout this module.
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _skipAuthRefresh?: boolean;
    _retried?: boolean;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const AXIOS_INSTANCE = Axios.create({ baseURL: BASE_URL });

// Requests carrying _skipAuthRefresh skip both the access-token attachment AND
// the 401-refresh retry. The refresh call itself uses this flag so it:
//  (a) sends its OWN Authorization header (refresh token, as the backend
//      expects via ExtractJwt.fromAuthHeaderAsBearerToken()), and
//  (b) doesn't trigger an infinite retry loop on refresh failure.
// Routing the refresh through AXIOS_INSTANCE (rather than a bare axios call)
// means the mock adapter bound to AXIOS_INSTANCE intercepts it in tests.

AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config._skipAuthRefresh) {
    const access = tokenStore.getAccess();
    if (access) config.headers.set('Authorization', `Bearer ${access}`);
  }
  return config;
});

const emitLogout = (): void => {
  tokenStore.clear();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('iws:logout'));
};

// Single-flight: concurrent 401s share one in-flight refresh promise so we
// only hit POST /auth/refresh once even if multiple requests fail simultaneously.
let refreshing: Promise<boolean> | null = null;

const refreshTokens = async (): Promise<boolean> => {
  const refresh = tokenStore.getRefresh();
  if (!refresh) return false;
  try {
    const res = await AXIOS_INSTANCE.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      undefined,
      // _skipAuthRefresh = true so the request interceptor does NOT overwrite
      // this Authorization header with the (stale) access token.
      // Cast needed here because .post() accepts AxiosRequestConfig, which
      // doesn't include our augmented InternalAxiosRequestConfig fields; the
      // request interceptor still receives InternalAxiosRequestConfig and reads
      // the flag correctly at runtime.
      {
        headers: { Authorization: `Bearer ${refresh}` },
        _skipAuthRefresh: true,
      } as AxiosRequestConfig & { _skipAuthRefresh: boolean },
    );
    tokenStore.set(res.data);
    return true;
  } catch {
    return false;
  }
};

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._skipAuthRefresh) {
      if (original._retried) {
        // Refresh already happened but the retried request still 401'd — give up.
        emitLogout();
        return Promise.reject(error);
      }
      original._retried = true;
      // Reuse or start a single-flight refresh
      refreshing ??= refreshTokens().finally(() => {
        refreshing = null;
      });
      const ok = await refreshing;
      if (ok) return AXIOS_INSTANCE(original);
      emitLogout();
    }

    return Promise.reject(error);
  },
);

// Orval calls the mutator as customInstance(config, options) — the second
// arg MUST be accepted (and merged) or the generated client fails to compile.
export const customInstance = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }) => data as T);
  (promise as Promise<T> & { cancel?: () => void }).cancel = () => {
    source.cancel('Query was cancelled');
  };
  return promise;
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
