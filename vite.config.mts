import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: '?hidepassed',
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
  },
});
