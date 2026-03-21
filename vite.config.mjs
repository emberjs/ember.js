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
import { templateTag } from '@embroider/vite';

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = require('@embroider/shared-internals');
const owerrideRoot = import.meta.url;
export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;

  const build = {
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: ['index.html'],
      output: {
        preserveModules: true,
      },
    },
    minify: mode === 'production',
  };

  // Use GXT_MODE=true to enable glimmer-next integration
  const useGxt = process.env.GXT_MODE === 'true';

  return {
    plugins: [
      // Use gxt compiler for glimmer-next or templateTag for standard Ember
      useGxt
        ? compiler(mode, {
            flags: {
              WITH_EMBER_INTEGRATION: true,
              WITH_HELPER_MANAGER: true,
              WITH_MODIFIER_MANAGER: true,
              TRY_CATCH_ERROR_HANDLING: false,
            },
          })
        : templateTag(),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts', '.gjs', '.gts'],
        configFile: resolve(dirname(fileURLToPath(import.meta.url)), './babel.test.config.mjs'),
      }),
      resolvePackages(
        {
          ...exposedDependencies(),
          ...hiddenDependencies(),
          // GXT subpath exports need explicit entries for resolvePackages
          '@lifeart/gxt/glimmer-compatibility': '@lifeart/gxt',
          '@lifeart/gxt/runtime-compiler': '@lifeart/gxt',
          'decorator-transforms/runtime': 'decorator-transforms',
        },
        { enableLocalDebug: true }
      ),
      viteResolverBug(),
      version(),
    ],
    optimizeDeps: { noDiscovery: true, include: ['expect-type'] },
    publicDir: 'tests/public',
    server: {
      hmr: {
        overlay: false,
      },
    },
    build,
    esbuild: false,
    envPrefix: 'VM_',
    resolve: useGxt
      ? {
          alias: [
            {
              find: 'ember-template-compiler',
              replacement: fileURLToPath(
                new URL(`./packages/demo/compat/ember-template-compiler`, owerrideRoot)
              ),
            },
            // Alias internal-test-helpers compile to use gxt compilation
            {
              find: /^internal-test-helpers\/lib\/compile$/,
              replacement: fileURLToPath(
                new URL(`./packages/demo/compat/test-compile`, owerrideRoot)
              ),
            },
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
              replacement: fileURLToPath(
                new URL(`./packages/demo/compat/glimmer-util`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/manager',
              replacement: fileURLToPath(new URL(`./packages/demo/compat/manager`, owerrideRoot)),
            },
            {
              find: '@glimmer/tracking/primitives/cache',
              replacement: fileURLToPath(new URL(`./packages/demo/compat/glimmer-tracking`, owerrideRoot)),
            },
            {
              find: '@glimmer/tracking',
              replacement: fileURLToPath(new URL(`./packages/demo/compat/glimmer-tracking`, owerrideRoot)),
            },
            {
              find: '@glimmer/validator',
              replacement: fileURLToPath(new URL(`./packages/demo/compat/validator`, owerrideRoot)),
            },
            {
              find: '@glimmer/destroyable',
              replacement: fileURLToPath(
                new URL(`./packages/demo/compat/destroyable`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/reference',
              replacement: fileURLToPath(new URL(`./packages/demo/compat/reference`, owerrideRoot)),
            },
            {
              find: '@lifeart/gxt/runtime-compiler',
              replacement: fileURLToPath(
                new URL(
                  `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js`,
                  owerrideRoot
                )
              ),
            },
            {
              find: 'decorator-transforms/runtime',
              replacement: fileURLToPath(
                new URL(
                  `./node_modules/decorator-transforms/dist/runtime.js`,
                  owerrideRoot
                )
              ),
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
                new URL(
                  `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.index.es.js`,
                  owerrideRoot
                )
              ),
            },
          ],
        }
      : undefined,
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
