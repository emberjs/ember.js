import { defineConfig, defaultClientConditions } from 'vite';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  // EMBER_MODERN=1 resolves ember-source's modern (legacy-free) build variant
  // instead of the standard one; bin/build-size-comparison-dists.sh builds
  // both so the size report compares the two on an identical app.
  resolve: process.env.EMBER_MODERN
    ? { conditions: ['ember-modern', ...defaultClientConditions] }
    : {},
  plugins: [
    ember(),
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
