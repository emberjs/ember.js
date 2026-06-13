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
import {
  GXT_SHIM_DIR,
  GXT_SHIM_ALIASES,
  gxtSubpathRegExp,
  isGxtEnabled,
} from './scripts/gxt-alias-map.mjs';
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

  // Use GXT_MODE=true to enable glimmer-next integration. `isGxtEnabled` also
  // honors EMBER_RENDER_BACKEND=gxt (additive — the vite harness only ever sets
  // GXT_MODE in CI, but the benchmark vite configs set both, and this keeps a
  // bare `EMBER_RENDER_BACKEND=gxt npx vite` working). See scripts/gxt-alias-map.mjs
  // for why rollup's USE_GXT_BACKEND must NOT symmetrically honor GXT_MODE.
  const useGxt = isGxtEnabled();

  // GXT builds: single-chunk output. preserveModules' ~1000 module files blew
  // past testem's 120s `browser_start_timeout` on the GXT Basic Test job
  // (fetch+parse before testem.js could connect), so the GXT pipeline bundles.
  //
  // Classic builds: keep upstream's `preserveModules: true` (one emitted file
  // per source module). This is correctness-relevant, not just layout: the
  // suite contains direct-eval implicit-scope tests (RFC931 `template(...,
  // { eval() { return eval(arguments[0]); } })` and the jit keyword suites)
  // whose `eval('helper')`/`eval('element')` must throw ReferenceError so the
  // compiler falls back to the keyword/builtin. A merged chunk hoists every
  // module's top-level bindings into ONE shared scope, so the eval resolves
  // arbitrary same-named internals (e.g. -in-element-null-check's `let
  // helper`) and the keyword path silently breaks — dist-only, invisible on
  // the dev server. Upstream CI runs testem against the preserveModules
  // output, which bounds the module-count load time for the classic set.
  const build = useGxt
    ? {
        minify: mode === 'production',
      }
    : {
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
      // Replace the bare `__GXT_MODE__` identifier with the boolean literal at
      // transform time. Vite's `define` option does NOT cover source code here
      // because this config sets `esbuild: false` — `define` would normally
      // run via esbuild's source transformer. (The `define` block elsewhere in
      // this config still works for node_modules dep prebundling because
      // optimizeDeps uses esbuild independently of the source-transform
      // pipeline.) This mirrors the rollup build's `replaceGxtModeFlag` plugin
      // so source files using the bare identifier work in both bundlers. See
      // types/gxt-ambient.d.ts for the TS declaration.
      replaceGxtModeFlag(useGxt),
      // Inline the build-time `__GXT_CLASSIC_COMPONENTS__` flag (default true).
      // Mirrors the rollup `replaceGxtClassicComponentsFlag` plugin so the test
      // harness keeps full classic-component support unless a native run sets
      // GXT_NATIVE=1 / EMBER_GXT_CLASSIC=0. See types/gxt-ambient.d.ts.
      replaceGxtClassicComponentsFlag(),
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
      // Exclude GXT entrypoints from dep pre-bundling so their imports of
      // shared dom/vm chunks resolve to the SAME module instances as the
      // aliased `@lifeart/gxt` import. Without this, Vite pre-bundles
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
    // In classic mode the gxt compiler plugin doesn't run, but glimmer-next
    // runtime code is still bundled (statically imported by
    // @ember/-internals/glimmer). That code references build-time constants
    // (WITH_CONTEXT_API, IS_DEV_MODE, etc.) which would otherwise survive as
    // free identifiers and crash at runtime. Define them here so the bundled
    // gxt code behaves correctly. In GXT mode the compiler plugin inlines
    // these itself, so `define:` is omitted to avoid double-replacement.
    //
    // NOTE on `__GXT_MODE__`: it is NOT in this `define:` block because the
    // identifier appears in this repo's TypeScript source, not in prebuilt
    // node_modules dist chunks. Vite's `define:` runs through esbuild on
    // source code, but this config sets `esbuild: false` (see below), so
    // `define:` only covers what Vite's dep prebundler (optimizeDeps) walks
    // — i.e. node_modules. Source-level replacement of `__GXT_MODE__` is
    // performed by the `replaceGxtModeFlag` plugin above.
    ...(useGxt
      ? {}
      : {
          define: {
            IS_GLIMMER_COMPAT_MODE: 'true',
            WITH_EMBER_INTEGRATION: 'true',
            WITH_HELPER_MANAGER: 'true',
            WITH_MODIFIER_MANAGER: 'true',
            WITH_CONTEXT_API: 'true',
            TRY_CATCH_ERROR_HANDLING: 'false',
            IS_DEV_MODE: mode === 'development' ? 'true' : 'false',
            // The remaining gxt compiler-plugin flags (defaults the GXT-mode
            // pipeline inlines). Any flag left out survives as a bare
            // identifier in the bundled gxt dist chunks and throws
            // ReferenceError when its code path runs — e.g. the Firefox CI
            // classic build crashed on SUPPORT_SHADOW_DOM in the
            // ember-outlet custom element path.
            SUPPORT_SHADOW_DOM: 'true',
            REACTIVE_MODIFIERS: 'true',
            RUN_EVENT_DESTRUCTORS_FOR_SCOPED_NODES: 'false',
            ASYNC_COMPILE_TRANSFORMS: 'true',
            WITH_DYNAMIC_EVAL: 'false',
            WITH_TYPE_CHECKER_HINTS: 'false',
          },
        }),
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
            // The `@glimmer/* | @ember/* | ember-template-compiler` → shim
            // redirects are derived from the SAME table the rollup build uses
            // (scripts/gxt-alias-map.mjs), so the two pipelines cannot drift.
            // `subpathTolerant` entries become anchored regexes so deep-path
            // imports introduced by upstream's vendored @glimmer/* migration
            // (e.g. `@glimmer/manager/lib/public/template`,
            // `@glimmer/validator/lib/tracking`, `@glimmer/reference/lib/iterable`)
            // collapse onto the single shim file. A bare string `find` would
            // prefix-rewrite the subpath onto a nonexistent shim PATH; the shims
            // are complete package replacements that re-export the full surface.
            ...GXT_SHIM_ALIASES.map(({ find, shim, subpathTolerant }) => ({
              find: subpathTolerant ? gxtSubpathRegExp(find) : find,
              replacement: fileURLToPath(new URL(`./${GXT_SHIM_DIR}/${shim}`, owerrideRoot)),
            })),
            // Alias internal-test-helpers compile to use gxt compilation
            // (vite test harness only — not part of the shared shim table).
            {
              find: /^internal-test-helpers\/lib\/compile$/,
              replacement: fileURLToPath(
                new URL(`./packages/@ember/-internals/gxt-backend/test-compile`, owerrideRoot)
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

// Replace the bare `__GXT_MODE__` identifier with the boolean literal so
// source code that writes `if (__GXT_MODE__) { ... }` const-folds at bundle
// time. Mirrors the same-named helper in rollup.config.mjs (which always
// inlines `false` for the classic dist).
//
// Vite's built-in `define:` is not used for this: `define:` is implemented via
// esbuild's source transform, which is disabled here (`esbuild: false`), so it
// only applies through optimizeDeps' dep prebundling — i.e. to node_modules
// code, not the ember source files where `__GXT_MODE__` actually appears.
//
// Skip GXT vendor chunks: their `IS_DEV_MODE`/`TRY_CATCH_ERROR_HANDLING` usage
// is handled separately (TRY_CATCH_ERROR_HANDLING is left as a runtime
// identifier, falsy at runtime). The `__GXT_MODE__` identifier is unique to
// ember-source files; @lifeart/gxt dist chunks don't reference it.
function replaceGxtModeFlag(useGxt) {
  const literal = useGxt ? 'true' : 'false';
  const GXT_MODE_RE = /\b__GXT_MODE__\b/g;
  return {
    name: 'replace-gxt-mode-flag',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].split('#')[0];
      if (cleanId.includes('/node_modules/')) return null;
      if (!code.includes('__GXT_MODE__')) return null;
      const replaced = code.replace(GXT_MODE_RE, literal);
      if (replaced === code) return null;
      return { code: replaced, map: null };
    },
  };
}

// Mirror of rollup's `replaceGxtClassicComponentsFlag`. Default true; flipped
// false by `EMBER_RENDER_BACKEND=gxt-native` (single canonical var) — or the
// legacy GXT_NATIVE=1 / EMBER_GXT_CLASSIC=0 aliases — to exercise the native (no
// classic-component emulation) path under the vite test harness.
function replaceGxtClassicComponentsFlag() {
  const classic = !(
    process.env.EMBER_RENDER_BACKEND === 'gxt-native' ||
    process.env.GXT_NATIVE === '1' ||
    process.env.EMBER_GXT_CLASSIC === '0'
  );
  const literal = classic ? 'true' : 'false';
  const RE = /\b__GXT_CLASSIC_COMPONENTS__\b/g;
  return {
    name: 'replace-gxt-classic-components-flag',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0].split('#')[0];
      if (cleanId.includes('/node_modules/')) return null;
      if (!code.includes('__GXT_CLASSIC_COMPONENTS__')) return null;
      const replaced = code.replace(RE, literal);
      if (replaced === code) return null;
      return { code: replaced, map: null };
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
// This patch removes ONLY the Lt.add/Ft.add tracking calls while keeping all
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
      // Pattern in the Ht (cell) constructor. Keep _debugName but remove the Set.add.
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
          // The workaround for a vite bug also hits an actual node bug:
          // passing `paths` to require.resolve to do the self-reference
          // resolution does not work.
          // https://github.com/nodejs/node/issues/47681
          //
          // So instead, a minimalist and incomplete implementation that's just
          // good enough for the features used here.
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
