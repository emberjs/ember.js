import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import * as resolveExports from 'resolve.exports';
import { babel } from '@rollup/plugin-babel';
import sharedBabelConfig from './babel.config.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const { PackageCache, packageName } = require('@embroider/shared-internals');
const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageCache = PackageCache.shared('ember-source', projectRoot);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin');
const canaryFeatures = require('./broccoli/canary-features');

const testDependencies = [
  'qunit',
  'vite',
  'js-reporters',
  '@simple-dom/serializer',
  '@simple-dom/void-map',
  'expect-type',
];

// Phase 0.9 POC: resolver-alias strategy for GXT dual-backend.
// When EMBER_RENDER_BACKEND=gxt, exposedDependencies() swaps a subset of
// @glimmer/* module IDs for the compat shims under packages/@ember/-internals/gxt-backend/.
// When unset (or "classic"), exposedDependencies() returns the exact same
// result as before — the classic build must remain byte-identical.
const RENDER_BACKEND = process.env.EMBER_RENDER_BACKEND || 'classic';
const USE_GXT_BACKEND = RENDER_BACKEND === 'gxt';

// Phase 2.5: bundle visualizer (gated by BUNDLE_VISUALIZER=1). Loaded here
// via top-level await so legacyBundleConfig() can push it synchronously
// into its plugins list. When the env var is unset, visualizerPlugin is a
// no-op factory and rollup's plugin array is unchanged from the default.
let visualizerPlugin = () => null;
if (process.env.BUNDLE_VISUALIZER === '1') {
  const { visualizer } = await import('rollup-plugin-visualizer');
  visualizerPlugin = visualizer;
}

// Packages that the shims import and that rollup should treat as external
// rather than trying to bundle. These are resolved at runtime by the host
// (vite dev / the published gxt package). They are only applied when
// USE_GXT_BACKEND is true so the classic build is unaffected.
const GXT_EXTERNAL_PACKAGES = new Set([
  '@lifeart/gxt',
  '@lifeart/gxt/glimmer-compatibility',
  '@lifeart/gxt/runtime-compiler',
  '@lifeart/gxt/compiler',
]);

// Packages dropped from the top-level entry map in GXT mode. They remain
// resolvable via exposedDependencies() (so stray imports still succeed),
// but are no longer emitted as their own dist/packages/@glimmer/* chunks.
// Anything not reachable from the remaining entry points gets tree-shaken.
const GXT_DROPPED_ENTRIES = new Set([
  '@glimmer/runtime',
  '@glimmer/opcode-compiler',
  '@glimmer/program',
  '@glimmer/wire-format',
  '@glimmer/encoder',
  '@glimmer/vm',
  '@glimmer/util',
  '@glimmer/global-context',
  '@glimmer/node',
  '@glimmer/owner',
]);

let configs = [
  esmConfig(),
  esmProdConfig(),
  glimmerComponent(),
  glimmerSyntaxESM(),
  glimmerSyntaxCJS(),
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
  return {
    ...renameEntrypoints(exposedDependencies(), (name) => join('packages', name, 'index')),
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
}

function sharedESMConfig({ input, debugMacrosMode, includePackageMeta = false }) {
  let outputDir = debugMacrosMode === false ? 'dist/prod' : 'dist/dev';
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    ...buildDebugMacroPlugin(debugMacrosMode),
    canaryFeatures(),
  ];

  let plugins = [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      configFile: false,
      ...babelConfig,
    }),
    resolveTS(),
    version(),
    resolvePackages({ ...exposedDependencies(), ...hiddenDependencies() }),
    pruneEmptyBundles(),
  ];

  if (includePackageMeta) {
    plugins.push(packageMeta());
  }

  return {
    onLog: handleRollupWarnings,
    input,
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

function glimmerComponent() {
  return {
    onLog: handleRollupWarnings,
    input: {
      index: './packages/@glimmer/component/src/index.ts',
    },
    output: {
      format: 'es',
      dir: 'packages/@glimmer/component/dist',
      hoistTransitiveImports: false,
      generatedCode: 'es2015',
    },
    plugins: [
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: false,
        ...sharedBabelConfig,
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
  let entryFiles = glob.sync('**/*.{ts,js}', {
    ignore: [
      // d.ts is not .ts
      '**/*.d.ts',

      // don't traverse into node_modules
      '**/node_modules/**',

      // these packages are special and don't get included here
      'loader/**',
      'ember-template-compiler/**',
      'internal-test-helpers/**',
      // Phase 0.9 POC: the demo workspace (including compat/ shims and
      // the vite-backed demo app) is not part of the published ember-source
      // bundle. It was accidentally pulled in because `packages()` globs
      // every file under `packages/`. Exclude it so the classic rollup
      // build is actually reproducible on the glimmer-next-fresh branch.
      'demo/**',

      // Phase 1: the gxt-backend package provides compat shims that are
      // alias-injected into the graph via resolvePackages when
      // EMBER_RENDER_BACKEND=gxt. It must not be picked up as a set of
      // standalone entrypoints for the classic build.
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
    ],
    cwd: 'packages',
  });

  // add only the entrypoints of the rolledUpPackages
  entryFiles = [
    ...entryFiles,
    ...glob.sync(`{${rolledUpPackages().join(',')}}/index.{js,ts}`, { cwd: 'packages' }),
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
  // packages from the entry map entirely. The POC measures whether
  // dropping them from the entry map is enough for rollup to eliminate
  // them from the output.
  const compatDir = resolve(packageCache.appRoot, 'packages/@ember/-internals/gxt-backend');
  const gxtOverrides = {
    '@glimmer/validator': resolve(compatDir, 'validator.ts'),
    '@glimmer/manager': resolve(compatDir, 'manager.ts'),
    '@glimmer/reference': resolve(compatDir, 'reference.ts'),
    '@glimmer/destroyable': resolve(compatDir, 'destroyable.ts'),
    '@glimmer/tracking': resolve(compatDir, 'glimmer-tracking.ts'),
    '@glimmer/tracking/primitives/cache': resolve(compatDir, 'glimmer-tracking.ts'),
    // ember-template-compiler is shim-replaced so @ember/template-compilation
    // etc. don't end up pulling in @glimmer/syntax + @glimmer/compiler.
    'ember-template-compiler': resolve(compatDir, 'ember-template-compiler.ts'),
    '@ember/template-compilation': resolve(compatDir, 'compile.ts'),
    '@ember/-internals/deprecations': resolve(compatDir, 'deprecate.ts'),
    '@glimmer/application': resolve(compatDir, 'glimmer-application.ts'),
    '@glimmer/utils': resolve(compatDir, 'glimmer-util.ts'),
  };

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
    'decorator-transforms/runtime': resolve(
      findFromProject('decorator-transforms').root,
      'dist/runtime.js'
    ),
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

      if (source === '@glimmer/local-debug-flags' && !enableLocalDebug) {
        return resolve(projectRoot, 'packages/@glimmer/local-debug-flags/disabled.ts');
      }

      let pkgName = packageName(source);
      if (pkgName) {
        // having a pkgName means this is not a relative import

        if (pkgName === '@embroider/macros') {
          return { external: true, id: pkgName };
        }

        // Phase 0.9 POC: @lifeart/gxt and its subpath exports are always
        // external — they're resolved by the host runtime (vite alias, the
        // published @lifeart/gxt npm package, or the demo's pnpm-managed
        // copy). This is needed regardless of EMBER_RENDER_BACKEND because
        // in-repo modules on the glimmer-next-fresh branch (e.g.
        // @ember/-internals/metal/lib/tracked.ts) statically import
        // @lifeart/gxt/glimmer-compatibility. Treating it as external keeps
        // the classic rollup build able to run at all.
        if (GXT_EXTERNAL_PACKAGES.has(source) || pkgName === '@lifeart/gxt') {
          return { external: true, id: source };
        }

        if (isExternal?.(source)) {
          return { external: true, id: source };
        }

        if (deps[source]) {
          return deps[source];
        }

        let candidateStem = resolve(projectRoot, 'packages', source);
        for (let suffix of ['', '.ts', '.js', '/index.ts', '/index.js']) {
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
        for (let suffix of ['', '.ts', '.js', '/index.ts', '/index.js']) {
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
              name.endsWith('.js')
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

  // Phase 0.9 POC: when EMBER_RENDER_BACKEND=gxt, @glimmer/manager is
  // aliased to packages/@ember/-internals/gxt-backend/manager.ts. That
  // shim transitively imports @ember/-internals/metal, which itself
  // imports @glimmer/manager, forming a cycle that mirrors the one
  // already allowed for the vendored @glimmer/manager package.
  'packages/@ember/-internals/gxt-backend/manager',
];

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
