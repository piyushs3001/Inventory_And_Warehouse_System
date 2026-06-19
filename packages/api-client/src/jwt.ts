import { tokenStore } from './token-store';

/**
 * Decode the `role` claim from a JWT access token (base64url payload).
 * UI convenience ONLY — never trust this for authorization. The server
 * re-verifies the signed token on every request.
 */
export function decodeJwtRole(token: string | null): string | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as { role?: unknown };
    return typeof claims.role === 'string' ? claims.role : null;
  } catch {
    return null;
  }
}

/** Role of the currently stored access token (or null). UI-only — see decodeJwtRole. */
export function getAccessRole(): string | null {
  return decodeJwtRole(tokenStore.getAccess());
}
