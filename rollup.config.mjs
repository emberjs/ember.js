import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import * as resolveExports from 'resolve.exports';
import { babel } from '@rollup/plugin-babel';
import { dts } from 'rollup-plugin-dts';
import sharedBabelConfig from './babel.config.mjs';
import { replaceBuildConstant } from './scripts/replace-build-constant.mjs';
import {
  GXT_SHIM_DIR,
  GXT_SHIM_ALIASES,
  GXT_SUBPATH_REDIRECTS,
  GXT_EXTERNAL_PACKAGES,
  GXT_DROPPED_ENTRIES,
  GXT_DIST_VM_STUBS,
  GXT_NATIVE_DIST_DROPPED_ENTRIES,
  NATIVE_FLAGS,
  NATIVE_DEBUG_FLAGS,
  gxtNativeSpecifierForPath,
  gxtSubpathRegExp,
  matchGxtNativeAlias,
} from './scripts/gxt-alias-map.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const { PackageCache, packageName } = require('@embroider/shared-internals');
const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageCache = PackageCache.shared('ember-source', projectRoot);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.cjs');
const canaryFeatures = require('./broccoli/canary-features.cjs');

const testDependencies = [
  '@ember/test-helpers',
  '@ember/test-waiters',
  'dom-element-descriptors',
  'ember-qunit',
  'qunit',
  'qunit-dom',
  'vite',
  'js-reporters',
  '@simple-dom/serializer',
  '@simple-dom/void-map',
  'expect-type',
  // Packages imported by compiled test source (GJS) or their helpers that
  // should fall through to vite's native node_modules resolution during
  // the GXT test harness. The classic rollup build never hits this path
  // because it doesn't bundle tests.
  'decorator-transforms',
  '@lifeart/gxt',
];

// Resolver-alias strategy for the GXT dual-backend.
// When EMBER_RENDER_BACKEND=gxt, exposedDependencies() swaps a subset of
// @glimmer/* module IDs for the compat shims under packages/@ember/-internals/gxt-backend/.
// When unset (or "classic"), exposedDependencies() returns the exact same
// result — the classic build is unchanged.
const RENDER_BACKEND = process.env.EMBER_RENDER_BACKEND || 'classic';
// `gxt` = the GXT COMPAT backend (gxt-backend shims + bridge).
//
// `gxt-native` is the gxt NATIVE layer (scripts/gxt-alias-map.mjs
// GXT_NATIVE_ALIASES):
// CLASSIC Ember source with `__GXT_MODE__ = false` (USE_GXT_BACKEND stays false,
// so exposedDependencies()/resolvePackages() are the classic dependency map —
// vite.config.mjs imports them from here for its native config too), with
//   - the native alias boundary applied on top (gxtNativeResolve: the SAME
//     GXT_NATIVE_ALIASES table vite uses, plus the resolved-path guard for
//     relative edges),
//   - the gxt template compiler under NATIVE_FLAGS over native/**/*.gts and the
//     build-time `precompileTemplate` call sites (gxtNativeCompiler),
//   - the entry map re-pointed at the native modules / VM-only packages dropped
//     (esmInputs), and
//   - `@lifeart/gxt` external (resolvePackages, as in every flavor): the
//     consuming app resolves it and compiles its own templates with the gxt
//     vite plugin under the same NATIVE_FLAGS.
// `node scripts/assert-native-dist.mjs` checks the result.
const USE_GXT_BACKEND = RENDER_BACKEND === 'gxt';
const USE_GXT_NATIVE = RENDER_BACKEND === 'gxt-native';

// Build-time toggle for the CLASSIC @ember/component emulation inside the
// gxt-backend manager. Default TRUE: the compat GXT build (and the classic
// build, which never imports manager.ts) is byte-unchanged. GXT_NATIVE=1 /
// EMBER_GXT_CLASSIC=0 flip it FALSE, so the `if (__GXT_CLASSIC_COMPONENTS__)` /
// `if (!__GXT_CLASSIC_COMPONENTS__)` guards in manager.ts const-fold and
// terser/DCE strips the classic curly + custom-manager + LinkTo +
// custom-element subtrees (an older compat-based "native" build, kept for
// comparison as `EMBER_RENDER_BACKEND=gxt GXT_NATIVE=1`; it is unrelated to
// `EMBER_RENDER_BACKEND=gxt-native`). Mirrors the __GXT_MODE__ flag mechanism
// (`replaceBuildConstant` in the plugin list below).
const GXT_CLASSIC_COMPONENTS = !(
  process.env.GXT_NATIVE === '1' || process.env.EMBER_GXT_CLASSIC === '0'
);

// Bundle visualizer (gated by BUNDLE_VISUALIZER=1). Loaded here
// via top-level await so legacyBundleConfig() can push it synchronously
// into its plugins list. When the env var is unset, visualizerPlugin is a
// no-op factory and rollup's plugin array is unchanged from the default.
let visualizerPlugin = () => null;
if (process.env.BUNDLE_VISUALIZER === '1') {
  const { visualizer } = await import('rollup-plugin-visualizer');
  visualizerPlugin = visualizer;
}

// The gxt template compiler, loaded only for the native dist (the classic and
// compat rollup builds never compile templates with it).
const gxtCompiler = USE_GXT_NATIVE ? (await import('@lifeart/gxt/compiler')).compiler : null;

// GXT_EXTERNAL_PACKAGES (externalized shim deps) and GXT_DROPPED_ENTRIES
// (VM packages dropped from the entry map) are imported from
// scripts/gxt-alias-map.mjs — the canonical GXT build contract — so this
// config and scripts/build-gxt-package.mjs can never disagree on the lists.
// Both are only applied when USE_GXT_BACKEND is true; the classic build is
// unaffected.

let configs = [
  esmConfig(),
  esmProdConfig(),
  glimmerComponent({ prod: false }),
  glimmerComponent({ prod: true }),
  glimmerSyntaxESM(),
  glimmerSyntaxCJS(),
  glimmerSyntaxTypes(),
];

if (process.env.DEBUG_SINGLE_CONFIG) {
  configs = configs.slice(
    parseInt(process.env.DEBUG_SINGLE_CONFIG),
    parseInt(process.env.DEBUG_SINGLE_CONFIG) + 1
  );
}

export default configs;

function esmConfig() {
  return sharedESMConfig({
    input: esmInputs(),
    debugMacrosMode: true,
    includePackageMeta: true,
  });
}

function esmProdConfig() {
  return sharedESMConfig({
    input: esmInputs(),
    debugMacrosMode: false,
  });
}

function esmInputs() {
  const inputs = {
    ...renameEntrypoints(entryExposedDependencies(), (name) => join('packages', name, 'index')),
    ...renameEntrypoints(packages(), (name) => join('packages', name)),
    // the actual authored "./packages/ember-template-compiler/index.ts" is
    // part of what powers the historical dist/ember-template-compiler.js AMD
    // bundle. It has historical cruft that has never been present in our ESM
    // builds.
    //
    // On the ESM build, the main entrypoint of ember-template-compiler is the
    // "minimal.ts" version, which has a lot less in it.
    'packages/ember-template-compiler/index': 'ember-template-compiler/minimal.ts',
  };
  if (USE_GXT_BACKEND) {
    // entryExposedDependencies() routes the GXT_SHIM_ALIASES specifiers to
    // the gxt-backend shims, but the spreads after it clobber some of those
    // ENTRY keys back to classic sources: the packages() glob re-adds every
    // in-repo module it doesn't ignore (it ignores @glimmer/**, so the
    // reactivity shims survive, but @ember/template-compilation and
    // @ember/-internals/deprecations do not), and the hardcoded minimal.ts
    // line above does the same for ember-template-compiler. Inter-module
    // RESOLUTION still got the shims, so consumers of the classic entry files
    // simply hit dead classic stubs — e.g. the published
    // `@ember/template-compilation` threw "precompileTemplate ... is meant to
    // be used at compile time" instead of running GXT's runtime compile.
    // Re-apply the shim overrides last so the published entry FILES match
    // what the rest of the dist graph already resolves.
    const compatRoot = resolve(packageCache.appRoot, GXT_SHIM_DIR);
    for (const { find, shim, entryShim } of GXT_SHIM_ALIASES) {
      const indexKey = join('packages', find, 'index');
      const bareKey = join('packages', find);
      // The PUBLISHED package entry roots the full-surface facade (`entryShim`,
      // which re-exports the runtime shim PLUS the `-vm-compat` test-only
      // module) when the package is split; otherwise the single `shim`. The
      // app's OWN intra-graph `@glimmer/<pkg>` imports still resolve to the
      // lean runtime `shim` via exposedDependencies()/resolvePackages, so the
      // test-only surface only ever lands in this separate entry chunk.
      const target = resolve(compatRoot, `${entryShim ?? shim}.ts`);
      if (inputs[bareKey] !== undefined && inputs[indexKey] === undefined) {
        inputs[bareKey] = target;
      } else {
        inputs[indexKey] = target;
      }
    }
  }
  if (USE_GXT_NATIVE) {
    // An entry whose specifier is on the native boundary publishes the NATIVE
    // module (`@glimmer/validator` → native/validator, `@ember/component` → the
    // native barrel, `@ember/template-compilation` → the runtime half of
    // build-time `precompileTemplate`, `@ember/template-compiler[/runtime]` →
    // the native runtime compiler, …) — the module every intra-dist import of
    // that specifier already resolves to. VM-only packages are not published at
    // all.
    for (const key of Object.keys(inputs)) {
      const specifier = key.replace(/^packages\//, '').replace(/\/index$/, '');
      if (GXT_NATIVE_DIST_DROPPED_ENTRIES.has(specifier)) {
        delete inputs[key];
        continue;
      }
      const hit = matchGxtNativeAlias(specifier);
      if (hit && hit.entry.match !== 'prefix') {
        inputs[key] = gxtNativeFile(hit.target, `entry ${key}`);
      }
    }
  }
  return inputs;
}

function sharedESMConfig({ input, debugMacrosMode, includePackageMeta = false }) {
  let outputDir = debugMacrosMode === false ? 'dist/prod' : 'dist/dev';
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    ...buildDebugMacroPlugin(debugMacrosMode),
    canaryFeatures(),
  ];

  // Production builds (`dist/prod`, debug macros stripped) drop JSDoc/line
  // comments. Comments carry zero runtime behavior and every consuming app's
  // minifier discards them anyway, so shipping them only inflates the published
  // dist (and the bundle-size gate that measures it) — most of all for the
  // heavily commented gxt-backend compat layer (manager.ts, compile.ts). We
  // KEEP the `@__PURE__` / `@__NO_SIDE_EFFECTS__` / `@license` / `@preserve`
  // annotations so a downstream minifier still gets its dead-code-elimination
  // hints and any legal banners survive. Dev builds (`dist/dev`) keep every
  // comment for debuggability. The `shouldPrintComment` predicate receives the
  // comment body WITHOUT its `/* */` or `//` delimiters; `@rollup/plugin-babel`
  // forwards it straight to babel's code generator.
  if (debugMacrosMode === false) {
    babelConfig.shouldPrintComment = (value) =>
      /@__PURE__|#__PURE__|@__NO_SIDE_EFFECTS__|@license|@preserve/.test(value);
  }

  let plugins = [
    // gxt-native: the alias boundary resolves first, and the gxt compiler sees
    // raw source (as the `enforce: 'pre'` vite plugin does in the native vite
    // config) before babel strips TypeScript.
    ...(USE_GXT_NATIVE
      ? [gxtNativeResolve(), gxtNativeCompiler(debugMacrosMode ? 'development' : 'production')]
      : []),
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      configFile: false,
      ...babelConfig,
    }),
    resolveTS(),
    version(),
    // Inline the build-time `__GXT_MODE__` flag: `false` for the classic and
    // gxt-native dists, `true` for the EMBER_RENDER_BACKEND=gxt dist. Modules
    // shared by both backends branch on it (e.g. templates/root.ts and
    // templates/outlet.ts export the classic precompiled template vs the GXT
    // factory), and terser/DCE then drops the dead branch. The vite configs
    // use the same plugin.
    replaceBuildConstant('__GXT_MODE__', () => USE_GXT_BACKEND),
    // Inline the build-time `__GXT_CLASSIC_COMPONENTS__` flag (default true).
    // GXT_NATIVE=1 / EMBER_GXT_CLASSIC=0 flips it false so the classic
    // component subtree in the compat manager.ts const-folds away under DCE.
    // The classic dist never imports manager.ts, so there it is a no-op that
    // only guarantees no bare identifier survives into an emitted chunk.
    replaceBuildConstant('__GXT_CLASSIC_COMPONENTS__', () => GXT_CLASSIC_COMPONENTS),
    resolvePackages({ ...exposedDependencies(), ...hiddenDependencies() }),
    pruneEmptyBundles(),
  ];

  if (includePackageMeta) {
    plugins.push(packageMeta());
  }

  if (USE_GXT_NATIVE) {
    plugins.push(gxtNativeDistManifest());
  }

  const visualized = visualizerPlugin();
  if (visualized) {
    plugins.push(visualized);
  }

  return {
    onLog: handleRollupWarnings,
    input,
    treeshake: {
      moduleSideEffects(id) {
        if (id.includes('packages/@glimmer/debug')) return false;
        if (id.includes('packages/@glimmer/env')) return false;
        if (id.includes('packages/@glimmer/local-debug-flags')) return false;
        if (!debugMacrosMode && id.includes('packages/@ember/debug')) return false;
        // The GXT bridge is a pure registry (typed accessors over module-local
        // state — no required top-level side effect). Shared classic modules
        // (glimmer/metal/runloop/routing) keep a static `import { … } from
        // '…/gxt-bridge'` at file scope, and every USE of those bindings is
        // wrapped in a build-time `if (__GXT_MODE__)` block that the classic
        // rollup folds to dead code. With the default `moduleSideEffects: true`,
        // rollup would still retain the whole bridge module (and emit its
        // ~5.6 kB of exported accessors) just because the import edge is
        // reachable. Marking it side-effect-free lets rollup drop the bridge
        // entirely once all its exports are unused — which is the case in the
        // classic dist after the `__GXT_MODE__` gating. In GXT builds the
        // bridge's exports ARE used, so it is retained normally.
        if (id.includes('gxt-backend/gxt-bridge')) return false;

        /**
         * our own side-effects are not for us to decide when to remove
         * (aside from those incurred from the develop/prod split)
         */
        return true;
      },
    },
    output: {
      format: 'es',
      dir: outputDir,
      hoistTransitiveImports: false,
      generatedCode: 'es2015',
      chunkFileNames: 'packages/shared-chunks/[name]-[hash].js',
    },
    plugins,
  };
}

function glimmerSyntaxESM() {
  return {
    onLog: handleRollupWarnings,
    input: './packages/@glimmer/syntax/index.ts',
    output: {
      format: 'es',
      file: 'packages/@glimmer/syntax/dist/es/index.js',
      hoistTransitiveImports: false,
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: false,
        ...sharedBabelConfig,
      }),
      resolveTS(),
      resolvePackages({ ...exposedDependencies(), ...hiddenDependencies() }),
    ],
  };
}
function glimmerSyntaxCJS() {
  return {
    onLog: handleRollupWarnings,
    input: './packages/@glimmer/syntax/index.ts',
    output: {
      format: 'cjs',
      file: 'packages/@glimmer/syntax/dist/cjs/index.cjs',
      hoistTransitiveImports: false,
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: false,
        ...sharedBabelConfig,
      }),
      resolveTS(),
      resolvePackages({ ...exposedDependencies(), ...hiddenDependencies() }),
    ],
  };
}

function glimmerSyntaxTypes() {
  return {
    onLog: handleRollupWarnings,
    input: './packages/@glimmer/syntax/index.ts',
    output: [
      { file: 'packages/@glimmer/syntax/dist/es/index.d.ts' },
      { file: 'packages/@glimmer/syntax/dist/cjs/index.d.cts' },
    ],
    external: ['simple-html-tokenizer'],
    plugins: [dts({ respectExternal: true, tsconfig: './packages/@glimmer/syntax/tsconfig.json' })],
  };
}

function glimmerComponent({ prod }) {
  let babelConfig = { ...sharedBabelConfig };
  let outputDir = prod ? 'dist/prod' : 'dist/dev';
  let isDebug = !prod;

  return {
    onLog: handleRollupWarnings,
    input: {
      index: './packages/@glimmer/component/src/index.ts',
    },
    output: {
      format: 'es',
      dir: `packages/@glimmer/component/${outputDir}`,
      hoistTransitiveImports: false,
      generatedCode: 'es2015',
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: false,
        ...babelConfig,
        plugins: [...babelConfig.plugins, ...buildDebugMacroPlugin(isDebug)],
      }),
      resolveTS(),
      externalizePackages({ ...exposedDependencies(), ...hiddenDependencies() }),
    ],
  };
}

function renameEntrypoints(entrypoints, fn) {
  return Object.fromEntries(Object.entries(entrypoints).map(([k, v]) => [fn(k), v]));
}

function packages() {
  // Start by treating every module as an entrypoint
  let entryFiles = globSync('**/*.{ts,js}', {
    ignore: [
      // d.ts is not .ts
      '**/*.d.ts',

      // don't traverse into node_modules
      '**/node_modules/**',

      // these packages are special and don't get included here
      'loader/**',
      'ember-template-compiler/**',
      'internal-test-helpers/**',

      // The gxt-backend package provides compat shims that are alias-injected
      // into the graph via resolvePackages when EMBER_RENDER_BACKEND=gxt. It
      // must not be picked up as a set of standalone entrypoints for the
      // classic build.
      '@ember/-internals/gxt-backend/**',

      // this is a real package that publishes by itself
      '@glimmer/component/**',

      // exclude these so we can add only their entrypoints below
      ...rolledUpPackages().map((name) => `${name}/**`),

      // don't include tests
      '@ember/-internals/*/tests/**' /* internal packages */,
      '*/*/tests/**' /* scoped packages */,
      '*/tests/**' /* packages */,
      '@ember/-internals/*/type-tests/**' /* internal packages */,
      '*/*/type-tests/**' /* scoped packages */,
      '*/type-tests/**' /* packages */,

      // all the glimmer-vm packages are handled instead as
      // "exposedDependencies" since they used to actually be dependencies.
      '@glimmer-workspace/**',
      '@glimmer/**',

      // @handlebars/parser is a hidden dependency, not an explicit entrypoint
      '@handlebars/**',

      // private helpers that must not become importable module paths
      '@ember/array/lib/sort-compare.ts',
    ],
    cwd: 'packages',
  });

  // add only the entrypoints of the rolledUpPackages
  entryFiles = [
    ...entryFiles,
    ...globSync(`{${rolledUpPackages().join(',')}}/index.{js,ts}`, { cwd: 'packages' }),
  ];

  return Object.fromEntries(
    entryFiles.map((filename) => [filename.replace(/\.[jt]s$/, ''), filename])
  );
}

function rolledUpPackages() {
  return [
    '@ember/-internals/browser-environment',
    '@ember/-internals/environment',
    '@ember/-internals/glimmer',
    '@ember/-internals/metal',
    '@ember/-internals/utils',
    '@ember/-internals/container',
    'router_js',
  ];
}

// these are the external packages that we historically "provided" from within
// ember-source. That is, other packages could actually depend on the copies of
// these that we publish.
export function exposedDependencies() {
  const classic = {
    'backburner.js': require.resolve('backburner.js/dist/es6/backburner.js'),
    rsvp: require.resolve('rsvp/lib/rsvp.js'),
    'dag-map': require.resolve('dag-map/dag-map.js'),
    router_js: require.resolve('router_js'),
    'route-recognizer': require.resolve('route-recognizer/dist/route-recognizer.es.js'),
    ...walkGlimmerDeps([
      '@glimmer/node',
      '@simple-dom/document',
      '@glimmer/manager',
      '@glimmer/destroyable',
      '@glimmer/owner',
      '@glimmer/opcode-compiler',
      '@glimmer/runtime',
      '@glimmer/validator',
    ]),
    '@glimmer/tracking': resolve(packageCache.appRoot, 'packages/@glimmer/tracking/index.ts'),
    '@glimmer/tracking/primitives/cache': resolve(
      packageCache.appRoot,
      'packages/@glimmer/tracking/primitives/cache.ts'
    ),
    '@glimmer/env': resolve(packageCache.appRoot, 'packages/@glimmer/env/index.ts'),
  };

  if (!USE_GXT_BACKEND) {
    return classic;
  }

  // GXT backend: route the @glimmer/* modules that have compat shims to
  // packages/@ember/-internals/gxt-backend/*.ts, and drop the VM/compiler
  // packages from the entry map entirely. Dropping them from the entry map is
  // enough for rollup to eliminate them from the output.
  //
  // The specifier → shim table is shared with vite.config.mjs via
  // scripts/gxt-alias-map.mjs so the two pipelines cannot drift. Rollup uses
  // exact-key matching (the `subpathTolerant` flag is vite-only — see that
  // module's docs) and appends the `.ts` extension that resolveTS would
  // otherwise have to discover. `ember-template-compiler` is shim-replaced so
  // @ember/template-compilation etc. don't pull in @glimmer/syntax +
  // @glimmer/compiler.
  const compatRoot = resolve(packageCache.appRoot, GXT_SHIM_DIR);
  const gxtOverrides = Object.fromEntries(
    GXT_SHIM_ALIASES.map(({ find, shim }) => [find, resolve(compatRoot, `${shim}.ts`)])
  );

  return { ...classic, ...gxtOverrides };
}

// Convenience helper used by esmConfig() to build the input map. In
// classic mode this returns exposedDependencies() verbatim. In gxt mode
// it returns the same map minus GXT_DROPPED_ENTRIES.
function entryExposedDependencies() {
  const deps = exposedDependencies();
  if (!USE_GXT_BACKEND) return deps;
  const filtered = { ...deps };
  for (const k of GXT_DROPPED_ENTRIES) delete filtered[k];
  return filtered;
}

// these are dependencies that we inline into our own published code but do not
// expose to consumers
export function hiddenDependencies() {
  return {
    'simple-html-tokenizer': entrypoint(
      findFromProject('@glimmer/syntax', 'simple-html-tokenizer'),
      'module'
    ).path,
    '@handlebars/parser': resolve(packageCache.appRoot, 'packages/@handlebars/parser/lib/index.js'),
    ...walkGlimmerDeps(['@glimmer/compiler']),
    ...(process.env.VITE_STABLE_DECORATORS
      ? {}
      : {
          'decorator-transforms/runtime': resolve(
            findFromProject('decorator-transforms').root,
            'dist/runtime.js'
          ),
          // Root entry needed for GXT-compiled test modules that import the
          // bare `decorator-transforms` package (e.g. via compiled GJS test
          // helpers). Classic rollup build doesn't hit this.
          'decorator-transforms': resolve(
            findFromProject('decorator-transforms').root,
            'dist/index.js'
          ),
        }),
  };
}

function walkGlimmerDeps(packageNames) {
  let seen = new Set();
  let entrypoints = {};
  let queue = packageNames.map((name) => findFromProject(name));
  let pkg;

  while ((pkg = queue.pop()) !== undefined) {
    if (seen.has(pkg)) {
      continue;
    }
    seen.add(pkg);

    if (!pkg.name.startsWith('@glimmer/') && !pkg.name.startsWith('@simple-dom/')) {
      continue;
    }

    let pkgModule = entrypoint(pkg, 'module');

    if (pkgModule && existsSync(pkgModule.path)) {
      entrypoints[pkg.name] = pkgModule.path;
    }

    let dependencies = pkg.dependencies;
    if (dependencies) {
      queue.push(...dependencies);
    }
  }

  return entrypoints;
}

function findFromProject(...names) {
  let current;

  let glimmerVmTarget = resolve(packageCache.appRoot, 'packages', names[0]);
  if (existsSync(glimmerVmTarget)) {
    // the glimmer-vm packages were historically deps but are now in our repo.
    // We don't list them as actual NPM deps of the top-level workspace because
    // we don't want their types leaking into our type-tests.
    names.shift();
    current = packageCache.get(glimmerVmTarget);
  } else {
    current = packageCache.get(packageCache.appRoot);
  }

  for (let name of names) {
    current = packageCache.resolve(name, current);
  }
  return current;
}

function entrypoint(pkg, which) {
  let module = pkg.packageJSON[which];
  if (!module) {
    let resolved = resolveExports.exports(pkg.packageJSON, '.', {
      conditions: ['default', 'module', 'import', 'browser', 'development'],
    });
    module = resolved?.[0];
  }
  if (!module) {
    return;
  }
  let resolved = resolve(pkg.root, module);
  let { dir, base } = parse(resolved);
  return {
    dir,
    base,
    path: resolved,
  };
}

function resolveTS() {
  return {
    name: 'resolve-ts',
    async resolveId(source, importer) {
      let result = await this.resolve(source, importer);
      if (result === null && importer) {
        // the rest of rollup couldn't find it
        let stem = resolve(dirname(importer), source);
        for (let candidate of ['.ts', '/index.ts']) {
          let fullPath = stem + candidate;
          if (existsSync(fullPath)) {
            return fullPath;
          }
        }
      }
      return result;
    },
  };
}

export function resolvePackages(deps, params) {
  const isExternal = params?.isExternal;
  const enableLocalDebug = params?.enableLocalDebug ?? false;
  // When true (vite dev server), skip the `external: true` returns for
  // runtime-loaded packages (@lifeart/gxt, decorator-transforms). Vite
  // serves those through its native node_modules resolver instead.
  // Without this, vite tries to serve `/@id/@lifeart/gxt` with no handler
  // and returns 404, causing test modules to fail to load.
  const viteDevFallthrough = params?.viteDevFallthrough ?? false;

  return {
    enforce: 'pre',
    name: 'resolve-packages',
    async resolveId(source) {
      if (source.startsWith('\0')) {
        return;
      }

      // the actual test entrypoints
      if (source.endsWith('index.html')) {
        return;
      }

      // GXT: RELATIVE intra-runtime edges into stubbed VM modules (bare-id
      // matching below can't see them). The only such edge today is the kept
      // vm/arguments module's '../compiled/opcodes/-debug-strip' import — see
      // GXT_DIST_VM_STUBS in scripts/gxt-alias-map.mjs.
      if (
        USE_GXT_BACKEND &&
        source.startsWith('.') &&
        source.endsWith('/compiled/opcodes/-debug-strip')
      ) {
        return resolve(projectRoot, GXT_SHIM_DIR, `${GXT_DIST_VM_STUBS.shim}.ts`);
      }

      if (source === '@glimmer/local-debug-flags' && !enableLocalDebug) {
        return resolve(projectRoot, 'packages/@glimmer/local-debug-flags/disabled.ts');
      }

      let pkgName = packageName(source);
      if (pkgName) {
        // having a pkgName means this is not a relative import

        if (pkgName === '@embroider/macros') {
          return { external: true, id: pkgName };
        }

        // @lifeart/gxt and its subpath exports are always external — they're
        // resolved by the host runtime (vite alias, the published @lifeart/gxt
        // npm package, or the demo's pnpm-managed copy). This applies
        // regardless of EMBER_RENDER_BACKEND: the gxt-backend modules (compat
        // shims, the native layer) and some vite-served test modules import
        // @lifeart/gxt directly, and the vite configs reuse this resolver.
        if (GXT_EXTERNAL_PACKAGES.has(source) || pkgName === '@lifeart/gxt') {
          if (viteDevFallthrough) {
            // Let vite resolve via node_modules natively.
            return;
          }
          return { external: true, id: source };
        }

        if (isExternal?.(source)) {
          return { external: true, id: source };
        }

        // GXT: classic-VM pipeline modules stubbed out of the GXT dist —
        // checked BEFORE the deps map because exposedDependencies()
        // deliberately keeps dropped packages resolvable there (so stray
        // imports succeed); the stub must win for these ids. See
        // GXT_DIST_VM_STUBS in scripts/gxt-alias-map.mjs.
        if (USE_GXT_BACKEND && GXT_DIST_VM_STUBS.ids.has(source)) {
          return resolve(projectRoot, GXT_SHIM_DIR, `${GXT_DIST_VM_STUBS.shim}.ts`);
        }

        // GXT: deep-path redirects layered on top of the package shims — the
        // test-only `@glimmer/<pkg>/lib/{collections,iterable}` subtrees route
        // to the `-vm-compat` module (where those exports were moved out of the
        // lean runtime shim). Checked BEFORE `deps[source]` and the
        // subpathTolerant collapse so the more-specific subtree wins. The only
        // live rollup importer is the standalone `@ember/reactive/collections`
        // entry; the bare specifier stays on the lean runtime shim.
        if (USE_GXT_BACKEND) {
          for (const r of GXT_SUBPATH_REDIRECTS) {
            if (gxtSubpathRegExp(r.find).test(source)) {
              return resolve(projectRoot, GXT_SHIM_DIR, `${r.shim}.ts`);
            }
          }
        }

        if (deps[source]) {
          return deps[source];
        }

        // GXT: collapse DEEP-PATH imports of the subpath-tolerant shim
        // specifiers onto the shim file, mirroring the vite pipeline's
        // `gxtSubpathRegExp` aliases. Without this, a vendored module like
        // `@glimmer/runtime/lib/modifiers/on.ts` importing
        // `@glimmer/manager/lib/internal/api` falls through to the
        // candidateStem lookup below and bundles the CLASSIC manager next to
        // the shim — a split-brain registry where `{{on}}`'s
        // setInternalModifierManager registration lands in a manager copy the
        // GXT renderer never consults (observed as `{{on}}` silently not
        // attaching listeners in apps consuming the assembled
        // ember-source-gxt package).
        if (USE_GXT_BACKEND) {
          for (const alias of GXT_SHIM_ALIASES) {
            if (!alias.subpathTolerant || source === alias.find) continue;
            if (gxtSubpathRegExp(alias.find).test(source)) {
              return resolve(projectRoot, GXT_SHIM_DIR, `${alias.shim}.ts`);
            }
          }
        }

        let candidateStem = resolve(projectRoot, 'packages', source);
        // Include '/src/index.ts' / '/src/index.js' so packages whose
        // authored source lives under a `src/` subdir (e.g. `@glimmer/component`
        // — a published v2 addon whose repo layout has no root index.ts) are
        // resolvable here. The classic rollup build doesn't hit this path for
        // `@glimmer/component` because it's excluded from `packages()` and
        // built by its own `glimmerComponent()` config; the lookup matters
        // only for the vite dev server used by the GXT test harness.
        for (let suffix of [
          '',
          '.ts',
          '.js',
          '/index.ts',
          '/index.js',
          '/src/index.ts',
          '/src/index.js',
        ]) {
          let candidate = candidateStem + suffix;
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate;
          }
        }

        if (testDependencies.includes(pkgName)) {
          // these are allowed to fall through and get resolved noramlly by vite
          // within our test suite.
          return;
        }

        // Anything not explicitliy handled above is an error, because we don't
        // want to accidentally incorporate anything else into the build.
        throw new Error(`missing in resolvePackages: ${source}`);
      }
    },
  };
}

export function externalizePackages(deps) {
  return {
    enforce: 'pre',
    name: 'resolve-packages',
    async resolveId(source) {
      if (source.startsWith('\0')) {
        return;
      }

      let pkgName = packageName(source);
      if (pkgName) {
        // having a pkgName means this is not a relative import

        if (deps[source]) {
          return { external: true, id: source };
        }

        let candidateStem = resolve(projectRoot, 'packages', source);
        // Keep in sync with resolvePackages() above — we also accept
        // `/src/index.{ts,js}` so packages whose authored source lives under
        // a `src/` subdir are recognized.
        for (let suffix of [
          '',
          '.ts',
          '.js',
          '/index.ts',
          '/index.js',
          '/src/index.ts',
          '/src/index.js',
        ]) {
          let candidate = candidateStem + suffix;
          if (existsSync(candidate) && statSync(candidate).isFile()) {
            return { external: true, id: source };
          }
        }

        // Anything not explicitliy handled above is an error, because we don't
        // want to accidentally incorporate anything else into the build.
        throw new Error(`don't understand ${source}`);
      }
    },
  };
}

export function version() {
  return {
    name: 'ember-version',
    load(id) {
      if (id[0] !== '\0' && id.endsWith('/ember/version.ts')) {
        let input = readFileSync(id, 'utf8');
        return {
          code: input.replace(
            'VERSION_GOES_HERE',
            JSON.parse(readFileSync('./package.json', 'utf8')).version
          ),
        };
      }
    },
  };
}

function pruneEmptyBundles() {
  return {
    name: 'prune-empty-bundles',
    generateBundle(options, bundles) {
      for (let [key, bundle] of Object.entries(bundles)) {
        if (bundle.code.trim() === '') {
          delete bundles[key];
        }
      }
    },
  };
}

// Mixins that Ember deprecates but still uses internally exist twice: a public
// copy that emits the deprecation, and an internal copy that applies silently.
// The internal copies are an implementation detail, so they are kept out of
// `renamed-modules` rather than being advertised as importable module paths.
// Matches `foo-internal.js` and `-internal.js`, but deliberately not the
// long-standing `-internals.js` modules, which stay listed.
function isInternalCopy(name) {
  return /(^|\/|-)internal\.js$/.test(name);
}

function packageMeta() {
  return {
    name: 'package-meta',
    generateBundle(_outputOptions, bundle) {
      let renamedModules = Object.fromEntries(
        Object.keys(bundle)
          .filter(
            (name) =>
              name.startsWith('packages/') &&
              !name.startsWith('packages/shared-chunks/') &&
              name.endsWith('.js') &&
              !isInternalCopy(name)
          )
          .sort()
          .map((name) => {
            return [
              name.replace(/^packages\//, ''),
              'ember-source/' + name.replace(/^packages\//, ''),
            ];
          })
      );
      let pkg = JSON.parse(readFileSync('package.json'));
      if (!pkg['ember-addon']) {
        pkg['ember-addon'] = {};
      }
      pkg['ember-addon']['renamed-modules'] = renamedModules;
      writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    },
  };
}

const allowedCycles = [
  // external and not causing problems
  'node_modules/rsvp/lib/rsvp',

  // TODO: these would be good to fix once they're in this repo
  'packages/@glimmer/debug',
  'packages/@glimmer/runtime',
  'packages/@glimmer/opcode-compiler',
  'packages/@glimmer/syntax',
  'packages/@glimmer/compiler',

  // When EMBER_RENDER_BACKEND=gxt, @glimmer/manager is aliased to
  // packages/@ember/-internals/gxt-backend/manager.ts. That shim transitively
  // imports @ember/-internals/metal, which itself imports @glimmer/manager,
  // forming a cycle that mirrors the one already allowed for the vendored
  // @glimmer/manager package.
  'packages/@ember/-internals/gxt-backend/manager',

  // Same class of cycle as the @glimmer/manager one above: the destroyable
  // shim under gxt-backend re-enters through @ember/runloop ->
  // @ember/-internals/metal -> @ember/-internals/meta, which re-imports
  // destroyable when the GXT resolver-alias is active.
  'packages/@ember/-internals/gxt-backend/destroyable',

  // The native twin of the cycle above (EMBER_RENDER_BACKEND=gxt-native):
  // @glimmer/destroyable → native/destroyable.ts schedules destruction on the
  // runloop, @ember/runloop → metal → meta re-imports destroyable.
  'packages/@ember/-internals/gxt-backend/native/destroyable',
  // native/validator.ts re-exports the vendored tracked collections (the full
  // `@glimmer/validator` surface) whose `../tracking` edges resolve back to it.
  'packages/@ember/-internals/gxt-backend/native/validator',
  // The native component manager hands by-name definitions to the resolver,
  // whose lookups wrap resolved components in the manager's named definition.
  'packages/@ember/-internals/gxt-backend/native/managers',
];

// ---------------------------------------------------------------------------
// gxt NATIVE dist (EMBER_RENDER_BACKEND=gxt-native)
// ---------------------------------------------------------------------------

// Repo-relative native alias target (no extension) → the source file.
function gxtNativeFile(target, why) {
  const base = resolve(projectRoot, target);
  for (const ext of ['', '.ts', '.gts', '.js', '.gjs', '/index.ts', '/index.js']) {
    const candidate = base + ext;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`[gxt-native] ${why} maps to ${target}, which does not exist`);
}

// The native alias boundary for rollup: the SAME GXT_NATIVE_ALIASES table the
// native vite config applies as resolve.alias (scripts/gxt-alias-map.mjs), for
//   - bare specifiers (first match wins; 'prefix' entries remap a directory),
//   - RELATIVE edges inside packages/ whose resolved path spells an aliased
//     specifier (the vendored collections' `../tracking`, LinkTo's
//     `../templates/link-to`) — vite's gxtNativeRelativeRedirect twin, sharing
//     gxtNativeSpecifierForPath — so an intra-package edge cannot pull the real
//     VM module back in,
//   - native/runtime-compile.ts's `NATIVE_FLAGS` / `NATIVE_DEBUG_FLAGS` import
//     from scripts/gxt-alias-map.mjs (the flag constants shared with the AOT
//     compiler; DEBUG builds compile with NATIVE_DEBUG_FLAGS): the dist inlines
//     the constants as a virtual module instead of bundling the build-script
//     module.
function gxtNativeResolve() {
  const packagesDir = resolve(projectRoot, 'packages') + '/';
  const FLAGS_ID = '\0gxt-native-flags';
  return {
    name: 'gxt-native-resolve',
    resolveId(source, importer) {
      if (source.startsWith('\0')) return null;
      if (source.endsWith('/scripts/gxt-alias-map.mjs')) return FLAGS_ID;
      if (source.startsWith('.')) {
        if (!importer) return null;
        const importerPath = importer.split('?')[0];
        if (!importerPath.startsWith(packagesDir)) return null;
        const specifier = gxtNativeSpecifierForPath(
          resolve(dirname(importerPath), source),
          packagesDir
        );
        if (!specifier) return null;
        const hit = matchGxtNativeAlias(specifier);
        if (!hit || hit.entry.match === 'prefix') return null;
        return gxtNativeFile(hit.target, `${source} (from ${importerPath})`);
      }
      const hit = matchGxtNativeAlias(source);
      return hit ? gxtNativeFile(hit.target, source) : null;
    },
    load(id) {
      if (id !== FLAGS_ID) return null;
      return (
        `export const NATIVE_FLAGS = Object.freeze(${JSON.stringify(NATIVE_FLAGS)});\n` +
        `export const NATIVE_DEBUG_FLAGS = Object.freeze(${JSON.stringify(NATIVE_DEBUG_FLAGS)});\n`
      );
    },
  };
}

// The gxt template compiler (`@lifeart/gxt/compiler`) is a VITE plugin. Rollup
// runs its `transform` hook but never the vite-only `config` hook — and that is
// where the plugin merges `options.flags` (and returns its `define` map).
// Without it the transform compiles with gxt's DEFAULT flags: a silent
// compat-shaped miscompile (no `$_tpl` brand / `$_self` / `$__tag`, `{{on}}`
// called directly). So this adapter calls the documented `config(userConfig,
// env)` hook once, verifies that every NATIVE_FLAGS value reached the merged
// flag set, and exposes only `transform` (.gts/.gjs, plus the build-time
// `precompileTemplate` call sites). The dev dist compiles in development mode
// without the HMR footer. The emitted templates import the gxt runtime from
// `@lifeart/gxt` (external) and reference no build-flag identifier.
function gxtNativeCompiler(mode) {
  const plugin = gxtCompiler(mode, { flags: { ...NATIVE_FLAGS }, disableHMR: true });
  const define = plugin.config({}, { mode, command: 'build' })?.define ?? {};
  const drift = Object.entries(NATIVE_FLAGS).filter(([flag, value]) => define[flag] !== value);
  if (drift.length > 0 || typeof plugin.transform !== 'function') {
    throw new Error(
      `[gxt-native] the gxt compiler plugin did not take NATIVE_FLAGS (${drift
        .map(([flag]) => flag)
        .join(', ')}); refusing to emit templates compiled with gxt default flags`
    );
  }
  return { name: 'gxt-native-compiler', transform: plugin.transform };
}

// Emits `gxt-native-manifest.json` next to the native dist (dist/<mode>/,
// outside the `packages/` tree the package exports map serves): per chunk, the
// source modules it contains (repo-relative) and its static / dynamic imports.
// The dist-level VM-free assertion (scripts/assert-native-dist.mjs) walks the
// import graph from the SHIPPED files and uses this only to name the source
// modules inside each reached chunk. JSON, so the *.js size gates never count
// it.
function gxtNativeDistManifest() {
  const rel = (id) => (id.startsWith(projectRoot + '/') ? id.slice(projectRoot.length + 1) : id);
  return {
    name: 'gxt-native-dist-manifest',
    generateBundle(_options, bundle) {
      const chunks = {};
      for (const item of Object.values(bundle)) {
        if (item.type !== 'chunk') continue;
        chunks[item.fileName] = {
          isEntry: item.isEntry,
          facadeModuleId: item.facadeModuleId ? rel(item.facadeModuleId) : null,
          imports: item.imports,
          dynamicImports: item.dynamicImports,
          modules: Object.fromEntries(
            Object.entries(item.modules).map(([id, m]) => [rel(id), m.renderedLength])
          ),
        };
      }
      this.emitFile({
        type: 'asset',
        fileName: 'gxt-native-manifest.json',
        source: JSON.stringify({ nativeFlags: NATIVE_FLAGS, chunks }, null, 1) + '\n',
      });
    },
  };
}

function handleRollupWarnings(level, log, handler) {
  switch (log.code) {
    case 'CIRCULAR_DEPENDENCY':
      if (log.ids.some((id) => allowedCycles.some((allowed) => id.includes(allowed)))) {
        // rsvp has some internal cycles but they don't bother us
        return;
      }
      process.stderr.write(
        `Circular dependency:\n${log.ids.map((id) => '    ' + id).join('\n')}\n`
      );
      throw new Error(`Circular dependencies are forbidden`);
    case 'EMPTY_BUNDLE':
      // Some of our entrypoints are type-only and result in empty bundles.
      // We prune the actual empty files elsewhere in this config (see
      // pruneEmptyBundles). This silences the warning from rollup about
      // them.
      return;
    default:
      handler(level, log);
  }
}
