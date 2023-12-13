import { dirname, parse, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import { babel } from '@rollup/plugin-babel';

const require = createRequire(import.meta.url);
const { PackageCache } = require('@embroider/shared-internals');
const packageCache = PackageCache.shared('ember-source', dirname(fileURLToPath(import.meta.url)));

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
      generatedCode: 'es2015',
      chunkFileNames: 'packages/shared-chunks/[name]-[hash].js',
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
      ...withAMDNaming(packages()),
    },
    output: {
      format: 'amd',
      dir: 'dist',
      generatedCode: 'es2015',
      preserveModules: true,
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

function concatenate() {
  return {
    name: 'custom-bundle-concatenate',
    generateBundle(options, bundles) {
      let code = [];
      for (let [key, bundle] of Object.entries(bundles)) {
        code.push(bundle.code);
        delete bundles[key];
      }
      // NEXT: this gets organized into ember.debug.js, ember-testing.js, and
      // ember-template-compiler.js
      bundles['all'] = {
        fileName: 'all.js',
        needsCodeReference: false,
        source: code.join('\n'),
        type: 'asset',
      };
    },
  };
}
