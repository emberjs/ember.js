import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    conditions: ['module', 'node', process.env['NODE_ENV'] ?? 'production'],
  },
});
