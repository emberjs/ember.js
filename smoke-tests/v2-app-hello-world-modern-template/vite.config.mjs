import { defineConfig, defaultClientConditions } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  resolve: {
    // opt into ember-source's modern (legacy-free) build variant
    conditions: ['ember-modern', ...defaultClientConditions],
  },
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
