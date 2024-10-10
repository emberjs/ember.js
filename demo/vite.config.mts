import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['content-tag', '@swc/wasm-web'],
  },
});
