import { defineConfig } from 'vite';
import { babel } from '@rollup/plugin-babel';
import { resolve, dirname, join } from 'node:path';
import { realpathSync, statSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { compiler } from '@lifeart/gxt/compiler';

import {
  version,
  resolvePackages,
  exposedDependencies,
  hiddenDependencies,
} from './rollup.config.mjs';
import { templateTag } from '@embroider/vite';

const localRequire = createRequire(import.meta.url);
const projectRoot = dirname(fileURLToPath(import.meta.url));
const { packageName: getPackageName, PackageCache } = localRequire('@embroider/shared-internals');
// Helper to resolve symlinks for GXT dist files so aliases match the dedup plugin's output
function resolveGxtPath(relativePath) {
  const symlinkPath = fileURLToPath(new URL(relativePath, import.meta.url));
  try {
    return realpathSync(symlinkPath);
  } catch {
    return symlinkPath;
  }
}
const owerrideRoot = import.meta.url;
export default defineConfig(({ mode }) => {
  process.env.EMBER_ENV = mode;

  // Use GXT_MODE=true to enable glimmer-next integration
  const useGxt = process.env.GXT_MODE === 'true';

  // preserveModules + preserveEntrySignatures are required for the GXT test
  // harness so test files can be served as independent modules; under the
  // classic build those settings break vite's modulepreload-polyfill, so
  // apply them only in GXT mode.
  const build = useGxt
    ? {
        rollupOptions: {
          preserveEntrySignatures: 'strict',
          input: ['index.html'],
          output: {
            preserveModules: true,
          },
        },
        minify: mode === 'production',
      }
    : {
        minify: mode === 'production',
      };

  return {
    plugins: [
      // Deduplicate GXT internal modules so they share one reactive core.
      // Vite's dev server already follows symlinks for /@fs/ serving, but
      // this plugin ensures consistency in environments where that doesn't work.
      ...(useGxt ? [gxtStalenessCheck(), gxtModuleDedup(), gxtPatchVmMemoryLeaks()] : []),
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
      // Redirect $_tag, $_maybeHelper, $_dc imports from @lifeart/gxt to
      // the Ember wrapper module. GXT-compiled templates import these
      // primitives directly from GXT which bypasses Ember's container-based
      // helper/component resolution. This plugin rewrites those imports so
      // they use the Ember-aware wrappers instead.
      ...(useGxt ? [gxtEmberWrapperRedirect()] : []),
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
          // Previously mapped to bare 'decorator-transforms' (a string, not a
          // path) which caused vite to 404 on /@id/decorator-transforms and
          // the test file failed to load, producing "No tests matched the
          // module" false-hangs. Now both /runtime and the bare root resolve
          // to real file paths from hiddenDependencies.
          // GXT compile chunk externals — only used at build time by the compiler plugin
          '@babel/core': '@lifeart/gxt',
          typescript: '@lifeart/gxt',
          'content-tag': '@lifeart/gxt',
        },
        { enableLocalDebug: true, viteDevFallthrough: true }
      ),
      viteResolverBug(),
      version(),
    ],
    optimizeDeps: {
      noDiscovery: true,
      include: ['expect-type'],
      // Phase 4.1b: exclude GXT entrypoints from dep pre-bundling so their
      // imports of shared dom/vm chunks resolve to the SAME module instances
      // as the aliased `@lifeart/gxt` import. Without this, Vite pre-bundles
      // `@lifeart/gxt/runtime-compiler` and produces a SECOND copy of the
      // dom chunk with its own `xt`/`Symbol()` state — causing
      // `GxtRehydrationDelegate.renderServerSide` to render into a root
      // created via a `createRoot` from one module while `$_tag` reads from
      // another, producing "Cannot read properties of null (reading 'element')".
      exclude: [
        '@lifeart/gxt',
        '@lifeart/gxt/runtime-compiler',
        '@lifeart/gxt/glimmer-compatibility',
      ],
    },
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
          // Force all importers to resolve to the same @lifeart/gxt module instance.
          // Prevents split-instance bugs (distinct cellsMap/currentTracker) that
          // arise when any importer sneaks in a direct dist-path import.
          dedupe: [
            '@lifeart/gxt',
            '@lifeart/gxt/glimmer-compatibility',
            '@lifeart/gxt/runtime-compiler',
          ],
          alias: [
            {
              find: 'ember-template-compiler',
              replacement: fileURLToPath(
                new URL(
                  `./packages/@ember/-internals/gxt-backend/ember-template-compiler`,
                  owerrideRoot
                )
              ),
            },
            // Alias internal-test-helpers compile to use gxt compilation
            {
              find: /^internal-test-helpers\/lib\/compile$/,
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/test-compile`, owerrideRoot)
              ),
            },
            {
              find: '@ember/template-compilation',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/compile`, owerrideRoot)
              ),
            },
            {
              find: '@ember/-internals/deprecations',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/deprecate`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/application',
              replacement: fileURLToPath(
                new URL(
                  `./packages/@ember/-internals/gxt-backend/glimmer-application`,
                  owerrideRoot
                )
              ),
            },
            {
              find: '@glimmer/utils',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/glimmer-util`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/manager',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/manager`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/tracking/primitives/cache',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/glimmer-tracking`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/tracking',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/glimmer-tracking`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/validator',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/validator`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/destroyable',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/destroyable`, owerrideRoot)
              ),
            },
            {
              find: '@glimmer/reference',
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/reference`, owerrideRoot)
              ),
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
                new URL(`./node_modules/decorator-transforms/dist/runtime.js`, owerrideRoot)
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

/**
 * Vite plugin that redirects $_tag, $_maybeHelper, $_dc imports from @lifeart/gxt
 * to the Ember wrapper module. Without this, GXT-compiled templates call the native
 * GXT primitives directly, bypassing Ember's container-based helper/component
 * resolution (e.g., helpers registered via owner.register('helper:foo', ...) are
 * invisible to the native primitives).
 */
function gxtEmberWrapperRedirect() {
  const REDIRECT_SYMBOLS = new Set(['$_tag', '$_maybeHelper', '$_dc']);
  const WRAPPER_MODULE = '@ember/-internals/gxt-backend/ember-gxt-wrappers';
  // Match import { ... } from "@lifeart/gxt" or from GXT dist paths
  const importRe =
    /import\s*\{([^}]+)\}\s*from\s*["'](@lifeart\/gxt|[^"']*gxt\.index\.es\.js[^"']*)["']/g;

  return {
    name: 'gxt-ember-wrapper-redirect',
    // No enforce — runs in normal phase, after GXT compiler (which is enforce: 'pre')
    transform(code, id) {
      // Only process files that import GXT primitives
      if (!code.includes('$_tag') && !code.includes('$_maybeHelper') && !code.includes('$_dc'))
        return null;
      // Skip node_modules
      if (id.includes('node_modules')) return null;

      let result = code;
      const redirected = [];
      const matches = [];

      importRe.lastIndex = 0;
      let match;
      while ((match = importRe.exec(code)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          specifiers: match[1],
          source: match[2],
        });
      }

      if (matches.length === 0) return null;

      // Process from last to first to preserve offsets
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const specifiers = m.specifiers
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const toRedirect = [];
        const toKeep = [];

        for (const spec of specifiers) {
          const parts = spec.split(/\s+as\s+/);
          const importedName = parts[0].trim();
          if (REDIRECT_SYMBOLS.has(importedName)) {
            toRedirect.push(spec);
          } else {
            toKeep.push(spec);
          }
        }

        if (toRedirect.length === 0) continue;

        let replacement = '';
        if (toKeep.length > 0) {
          replacement = `import { ${toKeep.join(', ')} } from "${m.source}"`;
        }

        result = result.slice(0, m.index) + replacement + result.slice(m.index + m.length);
        redirected.push(...toRedirect);
      }

      if (redirected.length > 0) {
        const importLine = `import { ${redirected.join(', ')} } from "${WRAPPER_MODULE}";\n`;
        result = importLine + result;
        return { code: result, map: null };
      }

      return null;
    },
  };
}

function gxtModuleDedup() {
  // Ensure all GXT internal module imports resolve to the same real filesystem
  // path. Vite's dev server already follows symlinks for /@fs/ serving, so in
  // most cases this is a no-op. It provides a safety net for environments where
  // symlink resolution doesn't happen automatically.
  const gxtDistDir = resolve(projectRoot, 'packages/demo/node_modules/@lifeart/gxt/dist');
  let gxtRealDistDir;
  try {
    gxtRealDistDir = realpathSync(gxtDistDir);
  } catch {
    gxtRealDistDir = gxtDistDir;
  }
  // If dist dir and real dir are the same, no symlinks to resolve
  const isSymlinked = gxtDistDir !== gxtRealDistDir;
  return {
    name: 'gxt-module-dedup',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isSymlinked) return; // No-op when not symlinked
      if (!importer || (!source.startsWith('./') && !source.startsWith('../'))) return;
      if (importer.startsWith('\0')) return;
      const importerPath = importer.split('?')[0].split('#')[0];
      let importerReal;
      try {
        importerReal = realpathSync(importerPath);
      } catch {
        importerReal = importerPath;
      }
      const resolvedPath = resolve(dirname(importerReal), source);
      let resolvedReal;
      try {
        resolvedReal = realpathSync(resolvedPath);
      } catch {
        resolvedReal = resolvedPath;
      }
      if (!resolvedReal.startsWith(gxtRealDistDir)) return;
      try {
        statSync(resolvedReal);
      } catch {
        return;
      }
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
  try {
    gxtRealDistDir = realpathSync(gxtDistDir);
  } catch {
    gxtRealDistDir = gxtDistDir;
  }
  return {
    name: 'gxt-patch-vm-memory-leaks',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].split('#')[0];
      // Only transform the VM chunk
      if (!cleanId.startsWith(gxtDistDir) && !cleanId.startsWith(gxtRealDistDir)) return;
      if (!cleanId.includes('vm-') && !cleanId.includes('gxt.core')) return;
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

/**
 * Vite plugin that checks if the GXT dist in the pnpm store is up-to-date
 * with the glimmer-next source. Runs once at server startup.
 *
 * Detection methods (in order of preference):
 * 1. If dist/.build-meta.json exists, compare its sourceHash with current source content hash
 * 2. Fall back to comparing newest source mtime vs newest dist mtime
 */
function gxtStalenessCheck() {
  const GXT_SOURCE_ROOT = '/Users/lifeart/Repos/glimmer-next';
  const gxtDistDir = resolve(projectRoot, 'packages/demo/node_modules/@lifeart/gxt/dist');
  let realDistDir;
  try {
    realDistDir = realpathSync(gxtDistDir);
  } catch {
    realDistDir = gxtDistDir;
  }

  function collectFiles(dir, extensions) {
    const results = [];
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === '__tests__' ||
            entry.name === '__test-utils__'
          )
            continue;
          results.push(...collectFiles(full, extensions));
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          results.push(full);
        }
      }
    } catch {
      // fs probing: missing/unreadable entries are expected
    }
    return results;
  }

  function computeSourceHash(files, rootDir) {
    const hash = createHash('md5');
    for (const f of files) {
      try {
        const rel = f.slice(rootDir.length);
        hash.update(rel + '\n');
        hash.update(readFileSync(f));
      } catch {
        // fs probing: missing/unreadable entries are expected
      }
    }
    return hash.digest('hex');
  }

  return {
    name: 'gxt-staleness-check',
    configResolved() {
      // Only check if glimmer-next source exists locally
      if (!existsSync(GXT_SOURCE_ROOT)) return;
      if (!existsSync(realDistDir)) return;

      const start = performance.now();

      // Method 1: Check .build-meta.json (content-based hash comparison)
      const metaPath = join(realDistDir, '.build-meta.json');
      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
          const srcFiles = [
            ...collectFiles(resolve(GXT_SOURCE_ROOT, 'src'), ['.ts', '.js', '.gts', '.gjs']),
            ...collectFiles(resolve(GXT_SOURCE_ROOT, 'plugins'), ['.ts', '.js']),
          ].sort();
          const currentHash = computeSourceHash(srcFiles, GXT_SOURCE_ROOT);

          const elapsed = (performance.now() - start).toFixed(1);

          if (currentHash !== meta.sourceHash) {
            console.error('');
            console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
            console.error('\x1b[1;31m  GXT DIST IS STALE!\x1b[0m');
            console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
            console.error('');
            console.error('  The GXT source at /Users/lifeart/Repos/glimmer-next/ has changed');
            console.error('  since the dist was last built and copied.');
            console.error('');
            console.error(
              '  Built:   ' +
                meta.buildTime +
                ' (git: ' +
                meta.gitHash +
                (meta.gitDirty ? ' dirty' : '') +
                ')'
            );
            console.error(
              '  Sources: ' + srcFiles.length + ' files, hash: ' + currentHash.slice(0, 12)
            );
            console.error('  Dist:    hash: ' + meta.sourceHash.slice(0, 12));
            console.error('');
            console.error('  To fix, run in /Users/lifeart/Repos/glimmer-next/:');
            console.error('    \x1b[1;33mnpm run build-lib\x1b[0m');
            console.error('');
            console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
            console.error(`  (staleness check took ${elapsed}ms)`);
            console.error('');
          } else {
            console.log(
              `\x1b[32m[gxt] Dist is up-to-date (git: ${meta.gitHash}${meta.gitDirty ? ' dirty' : ''}, check took ${elapsed}ms)\x1b[0m`
            );
          }
          return;
        } catch {
          // .build-meta.json exists but is invalid, fall through to method 2
        }
      }

      // Method 2: Timestamp comparison fallback (when no .build-meta.json)
      const srcFiles = collectFiles(resolve(GXT_SOURCE_ROOT, 'src'), [
        '.ts',
        '.js',
        '.gts',
        '.gjs',
      ]).concat(collectFiles(resolve(GXT_SOURCE_ROOT, 'plugins'), ['.ts', '.js']));
      if (srcFiles.length === 0) return;

      const distFiles = collectFiles(realDistDir, ['.js']);
      if (distFiles.length === 0) return;

      let newestSrcMtime = 0,
        newestSrcPath = '';
      for (const f of srcFiles) {
        try {
          const mt = statSync(f).mtimeMs;
          if (mt > newestSrcMtime) {
            newestSrcMtime = mt;
            newestSrcPath = f;
          }
        } catch {
          /* stale mtime probe */
        }
      }
      let newestDistMtime = 0,
        newestDistPath = '';
      for (const f of distFiles) {
        try {
          const mt = statSync(f).mtimeMs;
          if (mt > newestDistMtime) {
            newestDistMtime = mt;
            newestDistPath = f;
          }
        } catch {
          /* stale mtime probe */
        }
      }

      const elapsed = (performance.now() - start).toFixed(1);

      if (newestSrcMtime > newestDistMtime) {
        console.error('');
        console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
        console.error('\x1b[1;31m  GXT DIST MAY BE STALE!\x1b[0m');
        console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
        console.error('');
        console.error('  Newest source file is newer than newest dist file.');
        console.error('  Source: ' + newestSrcPath.replace(GXT_SOURCE_ROOT, '.'));
        console.error('          modified: ' + new Date(newestSrcMtime).toISOString());
        console.error('  Dist:   ' + newestDistPath.replace(realDistDir, 'dist/'));
        console.error('          modified: ' + new Date(newestDistMtime).toISOString());
        console.error('');
        console.error('  To fix, run in /Users/lifeart/Repos/glimmer-next/:');
        console.error('    \x1b[1;33mnpm run build-lib\x1b[0m');
        console.error('');
        console.error('\x1b[1;31m' + '='.repeat(70) + '\x1b[0m');
        console.error(
          `  (staleness check took ${elapsed}ms, no .build-meta.json — using mtime fallback)`
        );
        console.error('');
      } else {
        console.log(
          `\x1b[32m[gxt] Dist appears up-to-date by mtime (check took ${elapsed}ms, consider running build-lib to generate .build-meta.json)\x1b[0m`
        );
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
