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

let configs = [esmConfig(), esmTemplateCompiler(), glimmerComponent()];

if (process.env.DEBUG_SINGLE_CONFIG) {
  configs = configs.slice(
    parseInt(process.env.DEBUG_SINGLE_CONFIG),
    parseInt(process.env.DEBUG_SINGLE_CONFIG) + 1
  );
}

export default configs;

function esmConfig() {
  return sharedESMConfig({
    input: {
      ...renameEntrypoints(exposedDependencies(), (name) => join('packages', name, 'index')),
      ...renameEntrypoints(packages(), (name) => join('packages', name)),
    },
    debugMacrosMode: '@embroider/macros',
  });
}

function esmTemplateCompiler() {
  return sharedESMConfig({
    input: {
      // the actual authored "./packages/ember-template-compiler/index.ts" is
      // part of what powers the historical dist/ember-template-compiler.js AMD
      // bundle. It has historical cruft that has never been present in our ESM
      // builds.
      //
      // On the ESM build, the main entrypoint of ember-template-compiler is the
      // "minimal.ts" version, which has a lot less in it.

      'packages/ember-template-compiler/index': 'ember-template-compiler/minimal.ts',
    },
    // the template compiler is always in debug mode (and doesn't use
    // embroider/macros, so it's directly invokable on node)
    debugMacrosMode: true,
  });
}

function sharedESMConfig({ input, debugMacrosMode }) {
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    buildDebugMacroPlugin(debugMacrosMode),
    canaryFeatures(),
  ];

  return {
    onLog: handleRollupWarnings,
    input,
    output: {
      format: 'es',
      dir: 'dist',
      hoistTransitiveImports: false,
      generatedCode: 'es2015',
      chunkFileNames: 'packages/shared-chunks/[name]-[hash].js',
    },
    plugins: [
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
      packageMeta(),
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
    router_js: require.resolve('router_js/dist/modules/index.js'),
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
    '@handlebars/parser': entrypoint(
      findFromProject('@glimmer/syntax', '@handlebars/parser'),
      'module'
    ).path,
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
    generateBundle() {
      let renamedModules = Object.fromEntries(
        glob
          .sync('packages/**/*.js', { cwd: 'dist', nodir: true })
          .filter((name) => !name.startsWith('packages/shared-chunks/'))
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
      writeFileSync('package.json', JSON.stringify(pkg, null, 2));
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
