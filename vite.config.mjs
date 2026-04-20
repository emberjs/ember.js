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
import { templateTag } from '@embroider/vite';

const require = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = require('@embroider/shared-internals');

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

  return {
    plugins: [
      templateTag(),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts', '.gjs', '.gts'],
        configFile: resolve(dirname(fileURLToPath(import.meta.url)), './babel.test.config.mjs'),
      }),
      resolvePackages(
        { ...exposedDependencies(), ...hiddenDependencies() },
        { enableLocalDebug: true }
      ),
      viteResolverBug(),
      version(),
    ],
    // GXT compile-time constants (GXT dist files reference these as globals)
    define: {
      IS_DEV_MODE: mode === 'development' ? 'true' : 'false',
      IS_GLIMMER_COMPAT_MODE: 'true',
      TRY_CATCH_ERROR_HANDLING: 'true',
      SUPPORT_SHADOW_DOM: 'false',
      REACTIVE_MODIFIERS: 'true',
      WITH_HELPER_MANAGER: 'true',
      WITH_MODIFIER_MANAGER: 'true',
      WITH_EMBER_INTEGRATION: 'true',
      WITH_CONTEXT_API: 'true',
      ASYNC_COMPILE_TRANSFORMS: 'false',
      WITH_DYNAMIC_EVAL: 'false',
    },
    optimizeDeps: { noDiscovery: true, include: ['expect-type'] },
    publicDir: 'tests/public',
    build,
    esbuild: false,
    envPrefix: 'VM_',
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
