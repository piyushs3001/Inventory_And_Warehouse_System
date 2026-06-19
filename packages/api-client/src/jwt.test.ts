import { describe, it, expect } from 'vitest';
import { decodeJwtRole } from './jwt';

// Build a fake JWT (header.payload.signature) with a base64url payload.
function jwt(claims: Record<string, unknown>): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.sig`;
}

describe('decodeJwtRole', () => {
  it('reads the role claim', () => {
    expect(decodeJwtRole(jwt({ sub: 'u1', role: 'SUPER_ADMIN' }))).toBe('SUPER_ADMIN');
    expect(decodeJwtRole(jwt({ sub: 'u2', role: 'STAFF' }))).toBe('STAFF');
  });
  it('returns null for missing/invalid tokens', () => {
    expect(decodeJwtRole(null)).toBeNull();
    expect(decodeJwtRole('not-a-jwt')).toBeNull();
    expect(decodeJwtRole(jwt({ sub: 'u3' }))).toBeNull(); // no role claim
  });
});
