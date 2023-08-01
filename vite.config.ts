import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      ...babel({
        extensions: ['.ts', '.js'],
      }),
    },
  ],
  optimizeDeps: {
    disabled: true,
  },
});
