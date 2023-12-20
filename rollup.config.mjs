import { dirname, parse, resolve, join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import { babel } from '@rollup/plugin-babel';

const require = createRequire(import.meta.url);
const { PackageCache, packageName } = require('@embroider/shared-internals');
const projectRoot = dirname(fileURLToPath(import.meta.url));
const packageCache = PackageCache.shared('ember-source', projectRoot);
const { buildInfo } = require('./broccoli/build-info');

export default [
  esmConfig(),
  legacyBundleConfig('./lib/amd-compat-entrypoints/ember.debug.js', 'ember.debug.js'),
  legacyBundleConfig(
    './lib/amd-compat-entrypoints/ember-template-compiler.js',
    'ember-template-compiler.js'
  ),
];

function esmConfig() {
  return {
    input: {
      ...inSubdir(exposedDependencies(), 'dependencies'),
      ...inSubdir(packages(), 'packages'),
    },
    output: {
      format: 'es',
      dir: 'dist',
      hoistTransitiveImports: false,
      generatedCode: 'es2015',
      chunkFileNames: 'packages/shared-chunks/[name]-[hash].js',
    },
    plugins: [
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
      resolveTS(),
      version(),
      resolvePackages(exposedDependencies(), hiddenDependencies()),
    ],
  };
}

function inSubdir(entrypoints, subdir) {
  return Object.fromEntries(Object.entries(entrypoints).map(([k, v]) => [join(subdir, k), v]));
}

function legacyBundleConfig(input, output) {
  return {
    input,
    output: {
      format: 'iife',
      file: `dist/${output}`,
      generatedCode: 'es2015',
    },
    plugins: [
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
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
function exposedDependencies() {
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
function hiddenDependencies() {
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
        let candidate;
        if (source === '.') {
          candidate = resolve(dirname(importer), source) + '/index.ts';
        } else if (source.startsWith('.')) {
          candidate = resolve(dirname(importer), source) + '.ts';
        }
        if (candidate && existsSync(candidate)) {
          return candidate;
        }
      }
      return result;
    },
  };
}

function resolvePackages(...depsList) {
  return {
    name: 'resolve-packages',
    async resolveId(source) {
      let pkgName = packageName(source);
      if (pkgName) {
        // having a pkgName means this is not a relative import

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
        throw new Error(`missing ${source}`);
      }
    },
  };
}

function version() {
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
