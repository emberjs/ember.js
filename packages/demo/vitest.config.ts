import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    IS_DEV_MODE: 'false',
  },
  test: {
    include: ['compat/__tests__/**/*.test.ts'],
    environment: 'jsdom',
  },
});
