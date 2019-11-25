'use strict';

const { readFileSync, existsSync } = require('fs');
const path = require('path');
const Rollup = require('broccoli-rollup');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const Babel = require('broccoli-babel-transpiler');
const typescript = require('broccoli-typescript-compiler').default;
const BroccoliDebug = require('broccoli-debug');
const findLib = require('./find-lib');
const findPackage = require('./find-package');
const funnelLib = require('./funnel-lib');
const { VERSION } = require('./version');
const PackageJSONWriter = require('./package-json-writer');
const WriteFile = require('broccoli-file-creator');
const StringReplace = require('broccoli-string-replace');
const GlimmerTemplatePrecompiler = require('./glimmer-template-compiler');
const VERSION_PLACEHOLDER = /VERSION_STRING_PLACEHOLDER/g;
const canaryFeatures = require('./canary-features');
const injectNodeGlobals = require('./transforms/inject-node-globals');

const debugTree = BroccoliDebug.buildDebugCallback('ember-source');

module.exports.routerES = function _routerES() {
  return new Rollup(findLib('router_js'), {
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

module.exports.jquery = function _jquery() {
  return new Funnel(findLib('jquery'), {
    files: ['jquery.js'],
    destDir: 'jquery',
    annotation: 'jquery',
  });
};

module.exports.internalLoader = function _internalLoader() {
  return new Funnel('packages/loader/lib', {
    files: ['index.js'],
    getDestinationPath() {
      return 'loader.js';
    },
    annotation: 'internal loader',
  });
};

module.exports.qunit = function _qunit() {
  return new Funnel(findLib('qunit'), {
    files: ['qunit.js', 'qunit.css'],
    destDir: 'qunit',
    annotation: 'qunit',
  });
};

module.exports.getPackagesES = function getPackagesES() {
  let input = new Funnel(`packages`, {
    exclude: ['loader/**', 'external-helpers/**'],
    destDir: `packages`,
  });

  let debuggedInput = debugTree(input, `get-packages-es:input`);

  let compiledTemplatesAndTypescript = new GlimmerTemplatePrecompiler(debuggedInput, {
    persist: true,
    glimmer: require('@glimmer/compiler'),
    annotation: `get-packages-es templates -> es`,
  });

  let debuggedCompiledTemplatesAndTypeScript = debugTree(
    compiledTemplatesAndTypescript,
    `get-packages-es:templates-output`
  );

  let nonTypeScriptContents = debugTree(
    new Funnel(debuggedCompiledTemplatesAndTypeScript, {
      srcDir: 'packages',
      exclude: ['**/*.ts'],
    }),
    'get-packages-es:js:output'
  );

  let typescriptContents = new Funnel(debuggedCompiledTemplatesAndTypeScript, {
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
  return new Rollup(findLib('handlebars', 'lib'), {
    annotation: 'handlebars',
    rollup: {
      input: 'handlebars/compiler/base.js',
      output: {
        file: 'handlebars.js',
        format: 'es',
        exports: 'named',
      },
      plugins: [handlebarsFix()],
    },
  });
};

function handlebarsFix() {
  let HANDLEBARS_PARSER = /[\/\\]parser.js$/;
  return {
    load: function(id) {
      if (HANDLEBARS_PARSER.test(id)) {
        let code = readFileSync(id, 'utf8');
        return {
          code: code
            .replace('exports.__esModule = true;', '')
            .replace("exports['default'] = handlebars;", 'export default handlebars;'),

          map: { mappings: null },
        };
      }
    },
  };
}

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
  let packageInfo = findPackage('simple-html-tokenizer', '@glimmer/syntax');
  let moduleInfo = packageInfo.module;
  return new Rollup(moduleInfo.dir, {
    annotation: 'simple-html-tokenizer es',
    rollup: {
      input: moduleInfo.base,
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
  if (tree === undefined) {
    tree = new Rollup(pkg.module.dir, {
      rollup: {
        input: pkg.module.base,
        external: pkg.dependencies,
        output: {
          file: name + '.js',
          format: 'es',
        },
        // plugins: [{
        //   resolveId(id) {
        //     if (pkg.name === '@glimmer/opcode-compiler') {
        //       if (id === '@glimmer/compiler') {
        //         return require.resolve('./glimmer-compiler-stub');
        //       } else if (id === '@glimmer/bundle-compiler') {
        //         return require.resolve('./glimmer-bundle-compiler-stub');
        //       }
        //     }
        //   }
        // }]
      },
      annotation: name,
    });
    _glimmerTrees.set(name, tree);
  }
  return tree;
}

function glimmerTrees(entries) {
  let seen = new Set();

  // glimmer runtime has dependency on this even though it is only in tests
  seen.add('@glimmer/object');
  seen.add('@glimmer/object-reference');

  let trees = [];
  let queue = Array.isArray(entries) ? entries.slice() : [entries];
  let name;
  while ((name = queue.pop()) !== undefined) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    if (!name.startsWith('@glimmer/') && !name.startsWith("@simple-dom/")) {
      continue;
    }

    let pkg = findPackage(name);

    if (pkg.module && existsSync(pkg.module.path)) {
      trees.push(rollupGlimmerPackage(pkg));
    }

    let dependencies = pkg.dependencies;
    if (dependencies) {
      queue.push(...dependencies);
    }
  }
  return new Babel(new MergeTrees(trees), {
    sourceMaps: true,
    plugins: [
      // ensures `@glimmer/compiler` requiring `crypto` works properly
      // in both browser and node-land
      injectNodeGlobals,
    ],
  });
}

module.exports.glimmerCompilerES = () => {
  return glimmerTrees(['@glimmer/compiler']);
};

module.exports.glimmerES = function glimmerES(environment) {
  let glimmerEntries = ['@glimmer/node', '@simple-dom/document', '@glimmer/opcode-compiler', '@glimmer/syntax', '@glimmer/runtime'];

  if (environment === 'development') {
    let hasGlimmerDebug = true;
    try {
      require.resolve('@glimmer/debug');
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
