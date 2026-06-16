const KEY = 'iws.tokens';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

let memory: Tokens | null = null;

const isBrowser = (): boolean => typeof window !== 'undefined';

export const tokenStore = {
  set(tokens: Tokens): void {
    memory = tokens;
    if (isBrowser()) localStorage.setItem(KEY, JSON.stringify(tokens));
  },
  clear(): void {
    memory = null;
    if (isBrowser()) localStorage.removeItem(KEY);
  },
  hydrate(): void {
    if (!isBrowser()) return;
    const raw = localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as Tokens) : null;
  },
  getAccess(): string | null {
    return memory?.accessToken ?? null;
  },
  getRefresh(): string | null {
    return memory?.refreshToken ?? null;
  },
};
