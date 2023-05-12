import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: '?hidepassed',
  },
  mode: 'testing',
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
  },
});
