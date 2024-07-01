/* global process */

import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';
import { compiler } from '@lifeart/gxt/compiler';

import {
  version,
  resolvePackages,
  exposedDependencies,
  hiddenDependencies,
} from './rollup.config.mjs';

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = require('@embroider/shared-internals');
const owerrideRoot = import.meta.url;
export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;
  return {
    plugins: [
      compiler(mode, {
        flags: {
          WITH_EMBER_INTEGRATION: true,
          WITH_HELPER_MANAGER: false,
          WITH_MODIFIER_MANAGER: true,
          TRY_CATCH_ERROR_HANDLING: false,
        },
      }),
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
    server: {
      hmr: {
        overlay: false,
      },
    },
    build: {
      minify: mode === 'production',
    },
    resolve: {
      alias: [
        {
          find: '@ember/template-compilation',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/compile`, owerrideRoot)),
        },
        {
          find: '@ember/-internals/deprecations',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/deprecate`, owerrideRoot)),
        },
        {
          find: '@glimmer/application',
          replacement: fileURLToPath(
            new URL(`./packages/demo/compat/glimmer-application`, owerrideRoot)
          ),
        },
        {
          find: '@glimmer/utils',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/glimmer-util`, owerrideRoot)),
        },
        {
          find: '@glimmer/manager',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/manager`, owerrideRoot)),
        },
        {
          find: '@glimmer/validator',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/validator`, owerrideRoot)),
        },
        {
          find: '@glimmer/destroyable',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/destroyable`, owerrideRoot)),
        },
        {
          find: '@glimmer/reference',
          replacement: fileURLToPath(new URL(`./packages/demo/compat/reference`, owerrideRoot)),
        },

        {
          find: '@lifeart/gxt/glimmer-compatibility',
          replacement: fileURLToPath(
            new URL(
              `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.glimmer-compat.es.js`,
              owerrideRoot
            )
          ),
        },
        {
          find: '@lifeart/gxt',
          replacement: fileURLToPath(
            new URL(`./packages/demo/node_modules/@lifeart/gxt/dist/gxt.index.es.js`, owerrideRoot)
          ),
        },
      ],
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
