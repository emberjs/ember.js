import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
const deprecatedFeatures = require('./broccoli/deprecated-features.cjs');

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
  glimmerComponent(),
  glimmerSyntaxESM(),
  glimmerSyntaxCJS(),
];

// A deprecation-shaken variant: EMBER_DEPRECATION_FLAGS="DEPRECATE_X=false,..."
// (or "all=false") builds dist/deprecation-custom/{dev,prod} with the flagged
// deprecations compile-time folded and their guarded code paths eliminated.
// CI uses this to prove each shakable deprecation actually leaves the bundle;
// apps normally shake instead via the ember-source/deprecation-shaking plugin.
if (process.env.EMBER_DEPRECATION_FLAGS) {
  let flags = deprecatedFeatures.parseFlagsFromEnv(process.env.EMBER_DEPRECATION_FLAGS);
  configs.push(
    sharedESMConfig({ input: esmInputs(), debugMacrosMode: true, deprecationFlags: flags }),
    sharedESMConfig({ input: esmInputs(), debugMacrosMode: false, deprecationFlags: flags })
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

function sharedESMConfig({ input, debugMacrosMode, includePackageMeta = false, deprecationFlags }) {
  let distRoot = deprecationFlags ? 'dist/deprecation-custom' : 'dist';
  let outputDir = debugMacrosMode === false ? `${distRoot}/prod` : `${distRoot}/dev`;
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    ...buildDebugMacroPlugin(debugMacrosMode),
    canaryFeatures(),
  ];

  if (deprecationFlags) {
    // Shaken variant: fold the flags to literals so guarded deprecated code
    // paths are dead-code-eliminated by rollup's treeshake.
    babelConfig.plugins.push(deprecatedFeatures(deprecationFlags));
  }

  let plugins = [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      configFile: false,
      ...babelConfig,
    }),
    resolveTS(),
    version(),
    deprecationFlagsModule(deprecationFlags),
    resolvePackages(
      { ...exposedDependencies(), ...hiddenDependencies() },
      // The standard dist keeps @ember/deprecated-features live (externalized
      // to a package self-reference) so apps can shake per-deprecation. In
      // the shaken variant the imports are already folded away by babel.
      { externalizeDeprecatedFeatures: !deprecationFlags }
    ),
    pruneEmptyBundles(),
  ];

  if (includePackageMeta) {
    plugins.push(packageMeta());
    plugins.push(emitDeprecationFlagsMeta());
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
  const externalizeDeprecatedFeatures = params?.externalizeDeprecatedFeatures ?? false;

  return {
    enforce: 'pre',
    name: 'resolve-packages',
    async resolveId(source, importer) {
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

      // Keep the deprecation flags live in the published dist: consumers of
      // the flags import a single shared module (a package self-reference
      // that resolves through our own `exports` map), which the
      // ember-source/deprecation-shaking app plugin can replace to shake
      // deprecated code. Only imports are redirected; the module itself
      // (importer === undefined) still builds as a normal entrypoint.
      if (externalizeDeprecatedFeatures && importer && source === '@ember/deprecated-features') {
        return { external: true, id: 'ember-source/@ember/deprecated-features/index.js' };
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

// In a shaken variant build, rewrite the flags module itself so its exported
// constants match the variant's flag values (consumer imports are already
// folded by babel; this keeps the emitted module honest for anything that
// imports it at runtime).
function deprecationFlagsModule(deprecationFlags) {
  return {
    name: 'deprecation-flags-module',
    load(id) {
      if (
        deprecationFlags &&
        id[0] !== '\0' &&
        id.endsWith('packages/@ember/deprecated-features/index.ts')
      ) {
        return {
          code: Object.entries(deprecationFlags)
            .map(([name, value]) => `export const ${name} = ${value};\n`)
            .join(''),
        };
      }
    },
  };
}

// Machine-readable description of the shakable deprecation flags, consumed by
// the ember-source/deprecation-shaking app plugin.
function emitDeprecationFlagsMeta() {
  return {
    name: 'deprecation-flags-meta',
    generateBundle() {
      let meta = Object.entries(deprecatedFeatures.FLAGS).map(([name, { id, since, until }]) => ({
        const: name,
        id,
        since,
        until,
      }));
      // generateBundle runs before rollup writes its output, so dist/ may
      // not exist yet on a fresh checkout
      mkdirSync(resolve(projectRoot, 'dist'), { recursive: true });
      writeFileSync(
        resolve(projectRoot, 'dist/deprecation-flags.json'),
        JSON.stringify(meta, null, 2) + '\n'
      );
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
