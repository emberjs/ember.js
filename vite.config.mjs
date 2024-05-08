/* global process */

import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  version,
  resolvePackages,
  exposedDependencies,
  hiddenDependencies,
} from './rollup.config.mjs';

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = require('@embroider/shared-internals');

export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;
  return {
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: resolve(dirname(fileURLToPath(import.meta.url)), './babel.test.config.mjs'),
      }),
      resolvePackages(exposedDependencies(), hiddenDependencies()),
      viteResolverBug(),
      version(),
    ],
    optimizeDeps: { disabled: true },
    publicDir: 'tests/public',
    build: {
      minify: mode === 'production',
    },
  };
});

function viteResolverBug() {
  const packageCache = new PackageCache(projectRoot);
  // https://github.com/vitejs/vite/issues/9731
  return {
    name: 'vite-resolver-bug',
    resolveId(imported, importer) {
      let packageName = getPackageName(imported);
      if (packageName && importer) {
        let owner = packageCache.ownerOfFile(importer);
        if (owner?.name === packageName) {
          // Our workaround for a vite bug also hits an actual node bug.🤡 You'd
          // think we could pass `paths` to require.resolve in order to do the
          // self-reference resolution ourselves, but you'd be wrong.
          // https://github.com/nodejs/node/issues/47681
          //
          // So instead we have a very minimalist and incomplete implementation
          // that's just good enough for the features we use
          let hit = owner.packageJSON.exports?.['.' + imported.slice(packageName.length)];
          if (hit) {
            return {
              id: resolve(owner.root, hit),
            };
          }
        }
      }
    },
  };
}
