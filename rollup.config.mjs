import { dirname, parse, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import { babel } from '@rollup/plugin-babel';

const require = createRequire(import.meta.url);
const { PackageCache } = require('@embroider/shared-internals');
const packageCache = PackageCache.shared('ember-source', dirname(fileURLToPath(import.meta.url)));
const { buildInfo } = require('./broccoli/build-info');

export default [esmConfig(), amdConfig()];

function esmConfig() {
  return {
    input: {
      ...dependencies(),
      ...packages(),
    },
    output: {
      format: 'es',
      dir: 'dist',
      hoistTransitiveImports: false,
      preserveModules: true,
      generatedCode: 'es2015',
    },
    plugins: [
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
      resolveTS(),
      version(),
    ],
  };
}

function amdConfig() {
  return {
    input: {
      ...withAMDNaming(dependencies()),
      ...withAMDNaming(compilerDependencies()),
      ...withAMDNaming(packages()),
      ...withAMDNaming(compilerPackages()),
    },
    output: {
      format: 'amd',
      dir: 'dist',
      generatedCode: 'es2015',
      amd: {
        autoId: true,
      },
    },
    plugins: [
      babel({ babelHelpers: 'bundled', extensions: ['.js', '.ts'] }),
      resolveTS(),
      version(),
      concatenate(),
    ],
  };
}

function withAMDNaming(bundles) {
  return Object.fromEntries(
    Object.entries(bundles).map(([bundleName, filename]) => [
      bundleName.replace(/^dependencies\//, '').replace(/^packages\//, ''),
      filename,
    ])
  );
}

function packages() {
  // Start by treating every module as an entrypoint
  let entryFiles = glob.sync('packages/**/*.{ts,js}', {
    ignore: [
      // d.ts is not .ts
      '**/*.d.ts',

      // don't traverse into node_modules
      '**/node_modules/**',

      // these packages are special and don't get included here
      'packages/loader/**',
      'packages/external-helpers/**',
      'packages/ember-template-compiler/**',
      'packages/internal-test-helpers/**',

      // exclude these so we can add only their entrypoints below
      ...rolledUpPackages().map((name) => `packages/${name}/**`),

      // don't include tests
      'packages/@ember/-internals/*/tests/**' /* internal packages */,
      'packages/*/*/tests/**' /* scoped packages */,
      'packages/*/tests/**' /* packages */,
      'packages/@ember/-internals/*/type-tests/**' /* internal packages */,
      'packages/*/*/type-tests/**' /* scoped packages */,
      'packages/*/type-tests/**' /* packages */,
    ],
  });

  // add only the entrypoints of the rolledUpPackages
  entryFiles = [
    ...entryFiles,
    ...glob.sync(`packages/{${rolledUpPackages().join(',')}}/index.{js,ts}`),
  ];

  return Object.fromEntries(
    entryFiles.map((filename) => [filename.replace(/\.[jt]s$/, ''), filename])
  );
}

function compilerPackages() {
  let entryFiles = glob.sync('packages/ember-template-compiler/**/*.{ts,js}', {
    ignore: [
      // d.ts is not .ts
      '**/*.d.ts',

      // don't traverse into node_modules
      '**/node_modules/**',

      // don't include tests
      'packages/*/tests/**',
      'packages/*/type-tests/**',
    ],
  });

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

function dependencies() {
  return {
    'dependencies/backburner.js': require.resolve('backburner.js/dist/es6/backburner.js'),
    'dependencies/rsvp': require.resolve('rsvp/lib/rsvp.js'),
    'dependencies/dag-map': require.resolve('dag-map/dag-map.js'),
    'dependencies/router_js': require.resolve('router_js/dist/modules/index.js'),
    'dependencies/route-recognizer': require.resolve(
      'route-recognizer/dist/route-recognizer.es.js'
    ),
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

function compilerDependencies() {
  return {
    'dependencies/simple-html-tokenizer': entrypoint(
      findFromProject('@glimmer/syntax', 'simple-html-tokenizer'),
      'module'
    ).path,
    'dependencies/@handlebars/parser': entrypoint(
      findFromProject('@glimmer/syntax', '@handlebars/parser'),
      'module'
    ).path,
    ...walkGlimmerDeps(['@glimmer/compiler']),
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
      entrypoints[`dependencies/${pkg.name}`] = pkgModule.path;
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

function inEmberBundle(filename) {
  for (let prefix of [
    '@glimmer/compiler',
    '@glimmer/syntax',
    'simple-html-tokenizer',
    '@handlebars/parser',
    'ember-template-compiler',
  ]) {
    if (filename.startsWith(prefix)) {
      return false;
    }
  }
  return true;
}

function inTemplateCompilerBundle(filename) {
  for (let prefix of [
    '@glimmer/compiler',
    '@glimmer/env',
    '@glimmer/syntax',
    '@glimmer/util',
    '@glimmer/vm',
    '@glimmer/wire-format',
    '@handlebars/parser',
    'simple-html-tokenizer',
    '@ember/-internals/utils/',
    '@ember/-internals/environment/',
    '@ember/-internals/browser-environment/',
    '@ember/canary-features/',
    '@ember/debug/',
    '@ember/deprecated-features/',
    'ember/version.js',
    'ember-template-compiler/',
  ]) {
    if (filename.startsWith(prefix)) {
      return true;
    }
  }
  return false;
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

function concatenate() {
  return {
    name: 'custom-bundle-concatenate',
    generateBundle(options, bundles) {
      let emberBundle = [license(), loader()];
      let compilerBundle = [license(), loader()];

      for (let [key, bundle] of Object.entries(bundles)) {
        if (inEmberBundle(key)) {
          emberBundle.push(bundle.code);
        }
        if (inTemplateCompilerBundle(key)) {
          compilerBundle.push(bundle.code);
        }
        delete bundles[key];
      }

      // One might think: "hang on, we have an ember-testing.js bundle
      // specifically to hold the test-only stuff, so shouldn't you be removing
      // that from the main bundle?".
      //
      // But it turns out that since Ember 3.14 all the test-only stuff is
      // always in the prebuilt main bundle (and it's OK because prod builds
      // never use the prebuilt main bundle).
      bundles['ember'] = {
        fileName: 'ember.debug.js',
        needsCodeReference: false,
        source: emberBundle.join('\n'),
        type: 'asset',
      };

      bundles['ember-template-compiler'] = {
        fileName: 'ember-template-compiler.js',
        needsCodeReference: false,
        source: compilerBundle.join('\n'),
        type: 'asset',
      };
    },
  };
}
