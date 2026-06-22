import * as path from 'node:path';

/**
 * Default local upload directory, relative to the monorepo root.
 * Shared between `LocalStorageService` (writes files here) and
 * `app.setup.ts` (serves them via `express.static`) so both always
 * point at the same path — change it in one place and both stay in sync.
 */
export const DEFAULT_STORAGE_LOCAL_DIR = path.resolve(
  process.cwd(),
  '../../var/uploads',
);
