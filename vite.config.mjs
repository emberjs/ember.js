/* global process */

import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname } from 'node:path';
import { realpathSync, statSync } from 'node:fs';
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
// Helper to resolve symlinks for GXT dist files so aliases match the dedup plugin's output
function resolveGxtPath(relativePath) {
  const symlinkPath = fileURLToPath(new URL(relativePath, import.meta.url));
  try { return realpathSync(symlinkPath); } catch { return symlinkPath; }
}
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
      // Deduplicate GXT internal modules so they share one reactive core.
      // Vite's dev server already follows symlinks for /@fs/ serving, but
      // this plugin ensures consistency in environments where that doesn't work.
      ...(useGxt ? [gxtModuleDedup(), gxtPatchVmMemoryLeaks()] : []),
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
              replacement: resolveGxtPath(
                `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js`
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
              replacement: resolveGxtPath(
                `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.glimmer-compat.es.js`
              ),
            },
            {
              find: '@lifeart/gxt',
              replacement: resolveGxtPath(
                `./packages/demo/node_modules/@lifeart/gxt/dist/gxt.index.es.js`
              ),
            },
          ],
        }
      : undefined,
  };
});

function gxtModuleDedup() {
  // Ensure all GXT internal module imports resolve to the same real filesystem
  // path. Vite's dev server already follows symlinks for /@fs/ serving, so in
  // most cases this is a no-op. It provides a safety net for environments where
  // symlink resolution doesn't happen automatically.
  const gxtDistDir = resolve(projectRoot, 'packages/demo/node_modules/@lifeart/gxt/dist');
  let gxtRealDistDir;
  try { gxtRealDistDir = realpathSync(gxtDistDir); } catch { gxtRealDistDir = gxtDistDir; }
  // If dist dir and real dir are the same, no symlinks to resolve
  const isSymlinked = gxtDistDir !== gxtRealDistDir;
  return {
    name: 'gxt-module-dedup',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isSymlinked) return; // No-op when not symlinked
      if (!importer || !source.startsWith('./') && !source.startsWith('../')) return;
      if (importer.startsWith('\0')) return;
      const importerPath = importer.split('?')[0].split('#')[0];
      let importerReal;
      try { importerReal = realpathSync(importerPath); } catch { importerReal = importerPath; }
      const resolvedPath = resolve(dirname(importerReal), source);
      let resolvedReal;
      try { resolvedReal = realpathSync(resolvedPath); } catch { resolvedReal = resolvedPath; }
      if (!resolvedReal.startsWith(gxtRealDistDir)) return;
      try { statSync(resolvedReal); } catch { return; }
      return resolvedReal;
    },
  };
}

// Patch GXT VM to prevent unbounded growth of internal cell/formula tracking Sets
// that cause "Array buffer allocation failed" OOM errors when running the full
// test suite (8000+ tests in a single browser page).
// In dev mode, the GXT VM adds every cell to a global Set (Lt) and every formula
// to another Set (Ft). Cells are never removed. After thousands of tests the sets
// grow to hundreds of thousands of entries and exhaust browser memory.
// We surgically remove ONLY the Lt.add/Ft.add tracking calls while keeping all
// other IS_DEV_MODE validation/error-handling logic intact.
function gxtPatchVmMemoryLeaks() {
  const gxtDistDir = resolve(projectRoot, 'packages/demo/node_modules/@lifeart/gxt/dist');
  let gxtRealDistDir;
  try { gxtRealDistDir = realpathSync(gxtDistDir); } catch { gxtRealDistDir = gxtDistDir; }
  return {
    name: 'gxt-patch-vm-memory-leaks',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].split('#')[0];
      // Only transform the VM chunk
      if (!cleanId.startsWith(gxtDistDir) && !cleanId.startsWith(gxtRealDistDir)) return;
      if (!cleanId.includes('vm-')) return;
      if (!code.includes('IS_DEV_MODE')) return;

      let patched = code;
      // Remove cell tracking: IS_DEV_MODE&&(this._debugName=m(e),Lt.add(this))
      // Pattern in the Ht (cell) constructor. We keep _debugName but remove the Set.add.
      // The pattern looks like: IS_DEV_MODE&&(this._debugName=m(e),Lt.add(this))
      // Lt is the all-cells Set that grows unbounded.
      patched = patched.replace(
        /IS_DEV_MODE&&\(this\._debugName=([^,]+),(\w+)\.add\(this\)\)/g,
        'IS_DEV_MODE&&(this._debugName=$1)'
      );
      // Remove formula tracking: IS_DEV_MODE&&(this._debugName=m(e),Ft.add(this))
      // Ft is the all-formulas Set (already cleaned on destroy, but grows between tests).
      // The formula constructor has the same pattern with Ft.
      // (This is already handled by the regex above since it matches both Lt and Ft patterns)

      if (patched !== code) {
        return { code: patched, map: null };
      }
    },
  };
}

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
