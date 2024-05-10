import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import { babel } from '@rollup/plugin-babel';
import sharedBabelConfig from './babel.config.mjs';

const require = createRequire(import.meta.url);
const { PackageCache, packageName } = require('@embroider/shared-internals');
const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageCache = PackageCache.shared('ember-source', projectRoot);
const { buildInfo } = require('./broccoli/build-info');
const buildDebugMacroPlugin = require('./broccoli/build-debug-macro-plugin');
const canaryFeatures = require('./broccoli/canary-features');

const testDependencies = ['qunit', 'vite'];

export default [
  esmConfig(),
  legacyBundleConfig('./broccoli/amd-compat-entrypoints/ember.debug.js', 'ember.debug.js', true),
  legacyBundleConfig('./broccoli/amd-compat-entrypoints/ember.debug.js', 'ember.prod.js', false),
  legacyBundleConfig(
    './broccoli/amd-compat-entrypoints/ember-testing.js',
    'ember-testing.js',
    true
  ),
  templateCompilerConfig(),
];

function esmConfig() {
  let babelConfig = { ...sharedBabelConfig };
  babelConfig.plugins = [
    ...babelConfig.plugins,
    buildDebugMacroPlugin('@embroider/macros'),
    canaryFeatures(),
  ];

  return {
    input: {
      ...renameEntrypoints(exposedDependencies(), (name) => join('packages', name, 'index')),
      ...renameEntrypoints(packages(), (name) => join('packages', name)),
    },
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
      resolvePackages(exposedDependencies(), hiddenDependencies()),
    ],
  };
}

function renameEntrypoints(entrypoints, fn) {
  return Object.fromEntries(Object.entries(entrypoints).map(([k, v]) => [fn(k), v]));
}

function legacyBundleConfig(input, output, isDeveloping) {
  let babelConfig = { ...sharedBabelConfig };

  babelConfig.plugins = [...babelConfig.plugins, buildDebugMacroPlugin(isDeveloping)];

  return {
    input,
    output: {
      format: 'iife',
      file: `dist/${output}`,
      generatedCode: 'es2015',
      sourcemap: true,

      // We are relying on unfrozen modules because we need to add the
      // __esModule marker to them in our amd-compat-entrypoints. Rollup has an
      // `esModule` option too, but it only puts the marker on entrypoints. We
      // have a single entrypoint ("ember.debug.js") that imports a bunch of
      // modules and hands them to our classic AMD loader. All of those modules
      // need the __esModule marker too.
      freeze: false,
    },
    plugins: [
      amdDefineSupport(),
      ...(isDeveloping ? [concatenateAMDEntrypoints()] : []),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        configFile: false,
        ...babelConfig,
      }),
      resolveTS(),
      version(),
      resolvePackages(exposedDependencies(), hiddenDependencies()),
      licenseAndLoader(),
    ],
  };
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
      'external-helpers/**',
      'ember-template-compiler/**',
      'internal-test-helpers/**',

      // exclude these so we can add only their entrypoints below
      ...rolledUpPackages().map((name) => `${name}/**`),

      // don't include tests
      '@ember/-internals/*/tests/**' /* internal packages */,
      '*/*/tests/**' /* scoped packages */,
      '*/tests/**' /* packages */,
      '@ember/-internals/*/type-tests/**' /* internal packages */,
      '*/*/type-tests/**' /* scoped packages */,
      '*/type-tests/**' /* packages */,
    ],
    cwd: 'packages',
  });

  // add only the entrypoints of the rolledUpPackages
  entryFiles = [...entryFiles, ...glob.sync(`{${rolledUpPackages().join(',')}}/index.{js,ts}`)];

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
    ]),
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
  let current = packageCache.get(packageCache.appRoot);
  for (let name of names) {
    current = packageCache.resolve(name, current);
  }
  return current;
}

function entrypoint(pkg, which) {
  let module = pkg.packageJSON[which];
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
      if (result === null) {
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

export function resolvePackages(...depsList) {
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

        if (pkgName === '@embroider/macros') {
          return { external: true, id: pkgName };
        }

        for (let deps of depsList) {
          if (deps[source]) {
            return deps[source];
          }
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
        throw new Error(`missing ${source}`);
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

function amdDefineSupport() {
  return {
    name: 'amd-define-support',

    resolveId(source) {
      if (source === 'amd-compat-entrypoint-definition') {
        return '\0amd-compat-entrypoint-definition';
      }
    },

    load(id) {
      if (id === '\0amd-compat-entrypoint-definition') {
        return {
          code: `
            export default function d(name, mod) {
              Object.defineProperty(mod, '__esModule', { value: true });
              define(name, [], () => mod);
            };
          `,
        };
      }
    },
  };
}

function concatenateAMDEntrypoints() {
  const concatRules = {
    // this says: when you load the ember.debug.js AMD compat entrypoint, also
    // concatenate in the ember-testing.js AMD compat entrypoint.
    'ember.debug.js': ['ember-testing.js'],
  };

  return {
    name: 'concatenateAMDEntrypoints',
    load(id) {
      if (id[0] === '\0') {
        return;
      }
      for (let [target, extras] of Object.entries(concatRules)) {
        if (id.endsWith(`amd-compat-entrypoints/${target}`)) {
          let contents = [readFileSync(id), ...extras.map((e) => `import "./${e}";`)];
          return {
            code: contents.join('\n'),
          };
        }
      }
    },
  };
}

function license() {
  return `/*!
 * @overview  Ember - JavaScript Application Framework
 * @copyright Copyright 2011 Tilde Inc. and contributors
 *            Portions Copyright 2006-2011 Strobe Inc.
 *            Portions Copyright 2008-2011 Apple Inc. All rights reserved.
 * @license   Licensed under MIT license
 *            See https://raw.github.com/emberjs/ember.js/master/LICENSE
 * @version   ${buildInfo().version}
 */
`;
}

function loader() {
  return readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), 'packages', 'loader', 'lib', 'index.js')
  );
}

function licenseAndLoader() {
  return {
    name: 'license-and-loader',
    generateBundle(options, bundles) {
      for (let bundle of Object.values(bundles)) {
        bundle.code = license() + loader() + bundle.code;
      }
    },
  };
}

function templateCompilerConfig() {
  // These are modules that, when used in the legacy template compiler bundle,
  // need to be discovered from ember.debug.js instead when running in the
  // browser, and stubbed to ember-template-compiler.js in node.
  const externals = {
    '@ember/template-compilation': `{ __registerTemplateCompiler(){} }`,
    ember: `{
      get ENV() { return require('@ember/-internals/environment').ENV },
      get FEATURES() { return require('@ember/canary-features').FEATURES },
      get VERSION() { return require('ember/version').default },
    }`,
    '@ember/-internals/glimmer': `{ template: undefined }`,
    '@ember/application': `undefined`,
  };
  let config = legacyBundleConfig(
    './broccoli/amd-compat-entrypoints/ember-template-compiler.js',
    'ember-template-compiler.js',
    true
  );
  config.plugins.unshift({
    enforce: 'pre',
    name: 'template-compiler-externals',
    async resolveId(source) {
      if (externals[source]) {
        return { id: source, external: true };
      }
    },
  });
  config.output.globals = (id) => {
    return `(() => {
      try { 
        return require('${id}');
      } catch (err) {
        return ${externals[id]}
      }
    })()`;
  };
  return config;
}
