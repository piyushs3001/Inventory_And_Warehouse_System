import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Resolve shared packages to their TS source so vitest transforms them.
      '@iws/api-client': resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@iws/ui': resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@iws/auth': resolve(__dirname, '../../packages/auth/src/index.ts'),
    },
  },
});
