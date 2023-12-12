'use strict';

const { existsSync } = require('fs');
const path = require('path');
const Rollup = require('broccoli-rollup');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const typescript = require('broccoli-typescript-compiler').default;
const BroccoliDebug = require('broccoli-debug');
const findLib = require('./find-lib');
const { findFromProject, entrypoint } = require('./find-package');
const funnelLib = require('./funnel-lib');
const { VERSION } = require('./version');
const PackageJSONWriter = require('./package-json-writer');
const WriteFile = require('broccoli-file-creator');
const StringReplace = require('broccoli-string-replace');
const VERSION_PLACEHOLDER = /VERSION_STRING_PLACEHOLDER/g;
const canaryFeatures = require('./canary-features');

const debugTree = BroccoliDebug.buildDebugCallback('ember-source');

module.exports.routerES = function _routerES() {
  return new Rollup(findLib(['router_js']), {
    rollup: {
      external: ['route-recognizer', 'rsvp'],
      input: 'index.js',
      output: {
        file: 'router_js.js',
        format: 'es',
      },
    },
    annotation: 'router.js',
  });
};

module.exports.loader = function _loader() {
  return new Funnel('packages/loader/lib', {
    files: ['index.js'],
    getDestinationPath() {
      return 'loader.js';
    },
    annotation: 'internal loader',
  });
};

module.exports.qunit = function _qunit() {
  return new Funnel(findLib(['qunit']), {
    files: ['qunit.js', 'qunit.css'],
    destDir: 'qunit',
    annotation: 'qunit',
  });
};

module.exports.getPackagesES = function getPackagesES() {
  let input = new Funnel(`packages`, {
    exclude: ['loader/**', 'external-helpers/**', '**/node_modules'],
    destDir: `packages`,
  });

  let debuggedInput = debugTree(input, `get-packages-es:input`);

  let nonTypeScriptContents = debugTree(
    new Funnel(debuggedInput, {
      srcDir: 'packages',
      exclude: ['**/*.ts'],
    }),
    'get-packages-es:js:output'
  );

  let typescriptContents = new Funnel(debuggedInput, {
    include: ['**/*.ts'],
  });

  let typescriptCompiled = typescript(debugTree(typescriptContents, `get-packages-es:ts:input`), {
    compilerOptions: {
      sourceMap: false,
    },
  });

  let debuggedCompiledTypescript = debugTree(typescriptCompiled, `get-packages-es:ts:output`);

  let mergedFinalOutput = new MergeTrees([nonTypeScriptContents, debuggedCompiledTypescript], {
    overwrite: true,
  });

  let packageJSON = debugTree(
    new PackageJSONWriter(mergedFinalOutput),
    `get-packages-es:package-json`
  );

  mergedFinalOutput = canaryFeatures(
    new MergeTrees([mergedFinalOutput, packageJSON], { overwrite: true })
  );

  return debugTree(mergedFinalOutput, `get-packages-es:output`);
};

module.exports.handlebarsES = function _handlebars() {
  return new Rollup(findLib(['@glimmer/syntax', '@handlebars/parser'], 'dist/esm'), {
    annotation: '@handlebars/parser',
    rollup: {
      input: 'index.js',
      output: {
        file: '@handlebars/parser/index.js',
        format: 'es',
        exports: 'named',
      },
    },
  });
};

module.exports.rsvpES = function _rsvpES() {
  let lib = path.resolve(path.dirname(require.resolve('rsvp')), '../lib');
  return new Rollup(lib, {
    annotation: 'rsvp.js',
    rollup: {
      input: 'rsvp.js',
      output: {
        file: 'rsvp.js',
        format: 'es',
        exports: 'named',
      },
    },
  });
};

module.exports.backburnerES = function _backburnerES() {
  return funnelLib('backburner.js', 'dist/es6', {
    files: ['backburner.js'],
    annotation: 'backburner es',
    // This writes the "output" to `backburner.js.js` in the funnel, which means
    // that when it gets fed into the Babel AMD transform, which (implicitly)
    // pulls off the trailing `.js`, the result is just `backburner.js`, which
    // is the actual Node-resolve-able (and therefore TS-resolve-able) ES module
    // on disk.
    getDestinationPath: (relativePath) => relativePath + '.js',
  });
};

module.exports.dagES = function _dagES() {
  let lib = funnelLib('dag-map', {
    files: ['dag-map.js'],
    annotation: 'dag-map es',
  });

  return new StringReplace(lib, {
    files: ['dag-map.js'],
    patterns: [
      {
        match: /\/\/# sourceMappingURL=dag-map.js.map/g,
        replacement: '',
      },
    ],
    annotation: 'remove sourcemap annotation (dag-map)',
  });
};

module.exports.routeRecognizerES = function _routeRecognizerES() {
  return funnelLib('route-recognizer', {
    files: ['route-recognizer.es.js'],
    getDestinationPath() {
      return 'route-recognizer.js';
    },
    annotation: 'route-recognizer es',
  });
};

module.exports.simpleHTMLTokenizerES = function _simpleHTMLTokenizerES() {
  let { dir, base } = entrypoint(
    findFromProject('@glimmer/syntax', 'simple-html-tokenizer'),
    'module'
  );

  return new Rollup(dir, {
    annotation: 'simple-html-tokenizer es',
    rollup: {
      input: base,
      output: {
        file: 'simple-html-tokenizer.js',
        format: 'es',
        exports: 'named',
      },
    },
  });
};

const _glimmerTrees = new Map();

function rollupGlimmerPackage(pkg) {
  let name = pkg.name;
  let tree = _glimmerTrees.get(name);

  // @glimmer/debug and @glimmer/local-debug-flags are external dependencies,
  // but exist in dev-dependencies because they are fully removed before
  // publishing. Including them here allows Rollup to work for local builds.
  let externalDeps = Object.keys(pkg.packageJSON.dependencies || {}).concat([
    '@glimmer/debug',
    '@glimmer/local-debug-flags',
  ]);

  let pkgModule = entrypoint(pkg, 'module');

  if (tree === undefined) {
    tree = new Rollup(pkgModule.dir, {
      rollup: {
        input: pkgModule.base,
        external: externalDeps,
        output: {
          file: name + '.js',
          format: 'es',
        },
      },
      annotation: name,
    });
    _glimmerTrees.set(name, tree);
  }
  return tree;
}

function glimmerTrees(packageNames) {
  let seen = new Set();

  let trees = [];
  let queue = packageNames.map((name) => findFromProject(name));
  let pkg;

  while ((pkg = queue.pop()) !== undefined) {
    if (seen.has(pkg.name)) {
      continue;
    }
    seen.add(pkg.name);

    if (!pkg.name.startsWith('@glimmer/') && !pkg.name.startsWith('@simple-dom/')) {
      continue;
    }

    let pkgModule = entrypoint(pkg, 'module');

    if (pkgModule && existsSync(pkgModule.path)) {
      trees.push(rollupGlimmerPackage(pkg));
    }

    let dependencies = pkg.dependencies;
    if (dependencies) {
      queue.push(...dependencies);
    }
  }

  return new MergeTrees(trees);
}

module.exports.glimmerCompilerES = () => {
  return glimmerTrees(['@glimmer/compiler']);
};

module.exports.glimmerES = function glimmerES(environment) {
  let glimmerEntries = [
    '@glimmer/node',
    '@simple-dom/document',
    '@glimmer/manager',
    '@glimmer/destroyable',
    '@glimmer/owner',
    '@glimmer/opcode-compiler',
    '@glimmer/runtime',
  ];

  if (environment === 'development') {
    let hasGlimmerDebug = true;
    try {
      require.resolve('@glimmer/debug'); // eslint-disable-line n/no-missing-require
    } catch (e) {
      hasGlimmerDebug = false;
    }
    if (hasGlimmerDebug) {
      glimmerEntries.push('@glimmer/debug', '@glimmer/local-debug-flags');
    }
  }

  return glimmerTrees(glimmerEntries);
};

module.exports.emberVersionES = function _emberVersionES() {
  let content = 'export default ' + JSON.stringify(VERSION) + ';\n';
  return new WriteFile('ember/version.js', content, {
    annotation: 'ember/version',
  });
};

module.exports.emberLicense = function _emberLicense() {
  let license = new Funnel('generators', {
    files: ['license.js'],
    annotation: 'license',
  });

  return new StringReplace(license, {
    files: ['license.js'],
    patterns: [
      {
        match: VERSION_PLACEHOLDER,
        replacement: VERSION,
      },
    ],
    annotation: 'license',
  });
};
