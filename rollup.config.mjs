import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import * as resolveExports from 'resolve.exports';
import { babel } from '@rollup/plugin-babel';
import sharedBabelConfig from './babel.config.mjs';

// eslint-disable-next-line no-redeclare
const require = createRequire(import.meta.url);
const { PackageCache, packageName } = require('@embroider/shared-internals');
const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageCache = PackageCache.shared('ember-source', projectRoot);
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin.cjs');
const canaryFeatures = require('./broccoli/canary-features.cjs');
const legacyFeatures = require('./broccoli/legacy-features.cjs');

const testDependencies = [
  'qunit',
  'vite',
  'js-reporters',
  '@simple-dom/serializer',
  '@simple-dom/void-map',
  'expect-type',
];

let configs = [
  esmConfig(),
  esmProdConfig(),
  esmModernConfig(),
  esmModernProdConfig(),
  glimmerComponent(),
  glimmerSyntaxESM(),
  glimmerSyntaxCJS(),
];

if (process.env.EMBER_LEGACY_FLAGS) {
  configs.push(
    esmVariantConfig({ name: 'custom', flags: customFlags(), debugMacrosMode: true }),
    esmVariantConfig({ name: 'custom', flags: customFlags(), debugMacrosMode: false })
  );
}

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

function modernFlags() {
  return legacyFeatures.resolveFlags({
    CLASSIC_OBJECT_MODEL: false,
    CLASSIC_COMPONENTS: false,
    // stays true until a Route Manager-based query params replacement exists
    CONTROLLER_QUERY_PARAMS: true,
  });
}

function customFlags() {
  return legacyFeatures.parseFlagsFromEnv(process.env.EMBER_LEGACY_FLAGS);
}

function esmModernConfig() {
  return esmVariantConfig({ name: 'modern', flags: modernFlags(), debugMacrosMode: true });
}

function esmModernProdConfig() {
  return esmVariantConfig({ name: 'modern', flags: modernFlags(), debugMacrosMode: false });
}

function esmVariantConfig({ name, flags, debugMacrosMode }) {
  let { moduleSwaps, entrypointSwaps, prunedEntrypoints } = variantBuildOptions(flags);
  let input = { ...esmInputs() };
  for (let pruned of prunedEntrypoints) {
    delete input[pruned];
  }
  for (let [entrypoint, replacement] of Object.entries(entrypointSwaps)) {
    if (input[entrypoint] !== undefined) {
      input[entrypoint] = replacement;
    }
  }
  return sharedESMConfig({ input, debugMacrosMode, variant: { name, flags, moduleSwaps } });
}

// Each legacy section owns the coordinated build-time levers for its code:
// the flag's fold value (handled by broccoli/legacy-features.cjs), module
// swaps applied to import specifiers at resolve time, entrypoint swaps that
// replace the published module's implementation, and entrypoints pruned from
// the build entirely. Disabling a section activates all of its levers at
// once.
function legacySections() {
  return {
    CLASSIC_OBJECT_MODEL: {
      moduleSwaps: {
        '@ember/-internals/metal/lib/injected_property':
          '@ember/-internals/metal/lib/injected_property_modern.ts',
        '@ember/object/-internals': '@ember/object/-internals-modern.ts',
        '@ember/object': '@ember/object/index-modern.ts',
        '@ember/controller': '@ember/controller/index-modern.ts',
        '@ember/routing/lib/qp-array': '@ember/routing/lib/qp-array-modern.ts',
        '@ember/utils/lib/classic-detect': '@ember/utils/lib/classic-detect-modern.ts',
        '@ember/-internals/runtime/lib/mixins/-proxy':
          '@ember/-internals/runtime/lib/mixins/-proxy-modern.ts',
        '@ember/object/internals': '@ember/object/internals-modern.ts',
        'ember-testing/lib/adapters/adapter': 'ember-testing/lib/adapters/adapter-modern.ts',
      },
      entrypointSwaps: {
        'packages/@ember/object/-internals': '@ember/object/-internals-modern.ts',
        'packages/@ember/object/index': '@ember/object/index-modern.ts',
        'packages/@ember/object/internals': '@ember/object/internals-modern.ts',
        'packages/@ember/controller/index': '@ember/controller/index-modern.ts',
        'packages/@ember/routing/lib/qp-array': '@ember/routing/lib/qp-array-modern.ts',
        'packages/@ember/utils/lib/classic-detect': '@ember/utils/lib/classic-detect-modern.ts',
        'packages/ember-testing/lib/adapters/adapter':
          'ember-testing/lib/adapters/adapter-modern.ts',
        'packages/@ember/-internals/runtime/index': '@ember/-internals/runtime/index-modern.ts',
      },
      prunedEntrypoints: [
        // the metal barrel is what pulls the whole classic reactivity system
        // (mixin, computed, observers, ...) into the graph; modern-kept
        // modules deep-import the individual metal modules they need
        'packages/@ember/-internals/metal/index',
        // EmberObject and the mixin system
        'packages/@ember/object/core',
        'packages/@ember/object/mixin',
        'packages/@ember/object/observable',
        'packages/@ember/object/evented',
        'packages/@ember/object/events',
        'packages/@ember/object/observers',
        'packages/@ember/object/proxy',
        'packages/@ember/object/promise-proxy-mixin',
        'packages/@ember/object/compat',
        'packages/@ember/object/computed',
        'packages/@ember/object/lib/computed/computed_macros',
        'packages/@ember/object/lib/computed/reduce_computed_macros',
        // EmberArray (@ember/array/-internals stays: it is a standalone
        // WeakSet consulted by tracked/property_get)
        'packages/@ember/array/index',
        'packages/@ember/array/proxy',
        'packages/@ember/array/mutable',
        'packages/@ember/array/make',
        'packages/@ember/array/lib/is-array',
        'packages/@ember/array/lib/make-array',
        'packages/@ember/enumerable/index',
        'packages/@ember/enumerable/mutable',
        // inspector's DataAdapter is built on EmberArray; nothing in
        // ember-source registers it, so it can simply be absent
        'packages/@ember/debug/data-adapter',
        // classic runtime mixins (the RSVP ext deep module stays; the barrel
        // is swapped rather than pruned — see entrypointSwaps)
        'packages/@ember/-internals/runtime/lib/mixins/-proxy',
        'packages/@ember/-internals/runtime/lib/mixins/action_handler',
        'packages/@ember/-internals/runtime/lib/mixins/comparable',
        'packages/@ember/-internals/runtime/lib/mixins/container_proxy',
        'packages/@ember/-internals/runtime/lib/mixins/registry_proxy',
        'packages/@ember/-internals/runtime/lib/mixins/target_action_support',
      ],
    },
    CLASSIC_COMPONENTS: {
      moduleSwaps: {
        '@ember/component': '@ember/component/index-modern.ts',
        '@ember/-internals/glimmer': '@ember/-internals/glimmer/index-modern.ts',
        '@ember/-internals/views/lib/system/event_dispatcher':
          '@ember/-internals/views/lib/system/event_dispatcher_modern.ts',
      },
      entrypointSwaps: {
        'packages/@ember/component/index': '@ember/component/index-modern.ts',
        'packages/@ember/-internals/glimmer/index': '@ember/-internals/glimmer/index-modern.ts',
        'packages/@ember/-internals/views/index': '@ember/-internals/views/index-modern.ts',
        'packages/@ember/-internals/views/lib/system/event_dispatcher':
          '@ember/-internals/views/lib/system/event_dispatcher_modern.ts',
      },
      prunedEntrypoints: [
        // classic view/component support classes; `lib/system/utils` and the
        // fallback view registry stay (used by the renderer and LinkTo)
        'packages/@ember/-internals/views/lib/views/core_view',
        'packages/@ember/-internals/views/lib/views/states',
        'packages/@ember/-internals/views/lib/mixins/action_support',
        'packages/@ember/-internals/views/lib/compat/attrs',
      ],
    },
    CONTROLLER_QUERY_PARAMS: {
      // This flag stays enabled in every published variant until a query
      // params implementation that does not observe controller properties
      // exists (see RFC #1169). The seams are already in place for the flip:
      // swapping '@ember/routing/lib/qp-observers' for no-ops severs the
      // observer machinery, and '@ember/controller' / the controller_for and
      // generate_controller modules become prunable with it.
      moduleSwaps: {},
      entrypointSwaps: {},
      prunedEntrypoints: [],
    },
  };
}

function variantBuildOptions(flags) {
  let moduleSwaps = {};
  let entrypointSwaps = {};
  let prunedEntrypoints = [];
  for (let [flag, section] of Object.entries(legacySections())) {
    if (!flags[flag]) {
      Object.assign(moduleSwaps, section.moduleSwaps);
      Object.assign(entrypointSwaps, section.entrypointSwaps);
      prunedEntrypoints.push(...section.prunedEntrypoints);
    }
  }
  return { moduleSwaps, entrypointSwaps, prunedEntrypoints };
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

function sharedESMConfig({ input, debugMacrosMode, includePackageMeta = false, variant }) {
  let distRoot = variant ? `dist/${variant.name}` : 'dist';
  let outputDir = debugMacrosMode === false ? `${distRoot}/prod` : `${distRoot}/dev`;
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    ...buildDebugMacroPlugin(debugMacrosMode),
    canaryFeatures(),
    legacyFeatures(variant?.flags),
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
    resolvePackages(
      { ...exposedDependencies(), ...hiddenDependencies() },
      { moduleSwaps: variant?.moduleSwaps }
    ),
    pruneEmptyBundles(),
  ];

  if (includePackageMeta) {
    plugins.push(packageMeta());
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
  return {
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
}

// these are dependencies that we inline into our own published code but do not
// expose to consumers
export function hiddenDependencies() {
  return {
    'simple-html-tokenizer': entrypoint(
      findFromProject('@glimmer/syntax', 'simple-html-tokenizer'),
      'module'
    ).path,
    rsvp: resolve(findFromProject('rsvp').root, 'dist/es6/rsvp.es.js'),
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
  const moduleSwaps = params?.moduleSwaps ?? {};

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

        if (isExternal?.(source)) {
          return { external: true, id: source };
        }

        // variant builds substitute alternate implementations of specific
        // modules (see legacySections in this file)
        if (moduleSwaps[source]) {
          return resolve(projectRoot, 'packages', moduleSwaps[source]);
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
