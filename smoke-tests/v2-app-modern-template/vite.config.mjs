import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, defaultClientConditions } from 'vite';
import { extensions, classicEmberSupport, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

// @ember/test-helpers builds its mock-owner class with EmberObject.extend at
// module scope, which the modern variant cannot evaluate. Serve a shim that
// constructs it lazily instead (see shims/test-helpers-build-registry.js);
// removable once that load is lazy upstream.
function testHelpersBuildRegistryShim() {
  const shimPath = fileURLToPath(
    new URL('./shims/test-helpers-build-registry.js', import.meta.url),
  );
  const target =
    /@ember\/test-helpers\/dist\/-internal\/build-registry\.js(\?|$)/;
  return {
    name: 'test-helpers-build-registry-shim',
    load(id) {
      if (target.test(id)) {
        return readFileSync(shimPath, 'utf8');
      }
    },
  };
}

export default defineConfig({
  resolve: {
    // opt into ember-source's modern (legacy-free) build variant
    conditions: ['ember-modern', ...defaultClientConditions],
  },
  plugins: [
    testHelpersBuildRegistryShim(),
    classicEmberSupport(),
    ember(),
    // extra plugins here
    babel({
      babelHelpers: 'runtime',
      extensions,
    }),
  ],
});
