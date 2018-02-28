'use strict';

const { readFileSync, existsSync } = require('fs');
const path = require('path');
const Rollup = require('broccoli-rollup');
const Funnel = require('broccoli-funnel');
const filterTypeScript = require('broccoli-typescript-compiler').filterTypeScript;
const BroccoliDebug = require('broccoli-debug');
const findLib = require('./find-lib');
const findPackage = require('./find-package');
const funnelLib = require('./funnel-lib');
const { VERSION } = require('./version');
const WriteFile = require('broccoli-file-creator');
const StringReplace = require('broccoli-string-replace');
const { RELEASE, DEBUG, toConst } = require('./features');
const GlimmerTemplatePrecompiler = require('./glimmer-template-compiler');
const VERSION_PLACEHOLDER = /VERSION_STRING_PLACEHOLDER/g;
const { stripIndent } = require('common-tags');
const toES5 = require('./to-es5');

const debugTree = BroccoliDebug.buildDebugCallback('ember-source');

module.exports.routerES = function _routerES() {
  return new Rollup(findLib('router_js'), {
    rollup: {
      external: ['route-recognizer', 'rsvp'],
      input: 'index.js',
      output: {
        file: 'router.js',
        format: 'es'
      }
    },
    annotation: 'router.js'
  });
};


module.exports.jquery = function _jquery() {
  return new Funnel(findLib('jquery'), {
    files: ['jquery.js'],
    destDir: 'jquery',
    annotation: 'jquery'
  });
};

module.exports.internalLoader = function _internalLoader() {
  return new Funnel('packages/loader/lib', {
    files: ['index.js'],
    getDestinationPath() {
      return 'loader.js';
    },
    annotation: 'internal loader'
  });
};

module.exports.qunit = function _qunit() {
  return new Funnel(findLib('qunit'), {
    files: ['qunit.js', 'qunit.css'],
    destDir: 'qunit',
    annotation: 'qunit'
  });
};

module.exports.emberGlimmerES = function _emberGlimmerES() {
  let input = new Funnel('packages/ember-glimmer/lib', {
    destDir: 'packages/ember-glimmer/lib'
  });

  let debuggedInput = debugTree(input, 'ember-glimmer:input');

  let compiledTemplatesAndTypescript = new GlimmerTemplatePrecompiler(debuggedInput, {
    persist: true,
    glimmer: require('@glimmer/compiler'),
    annotation: 'ember-glimmer es'
  });

  let debuggedCompiledTemplatesAndTypeScript = debugTree(compiledTemplatesAndTypescript, 'ember-glimmer:templates-output');

  let typescriptCompiled = filterTypeScript(debuggedCompiledTemplatesAndTypeScript, {
    noImplicitAny: false
  });

  let funneled = new Funnel(typescriptCompiled, {
    getDestinationPath(path) {
      return path.replace('/lib/', '/').replace('packages/', '/');
    }
  });

  let rollup = new Rollup(funneled, {
    annotation: 'ember-glimmer',
    rollup: {
      external: [
        '@glimmer/reference',
        '@glimmer/runtime',
        '@glimmer/node',
        '@glimmer/opcode-compiler',
        '@glimmer/program',
        '@glimmer/wire-format',
        '@glimmer/util',
        'ember-console',
        'ember-debug',
        'ember-env-flags',
        'ember/features',
        'ember-environment',
        'ember-utils',
        'ember-metal',
        'ember-runtime',
        'ember-views',
        'ember-routing',
        'node-module',
        'rsvp',
        'container'
      ],
      input: 'ember-glimmer/index.js',
      output: {
        file: 'ember-glimmer.js',
        format: 'es',
        exports: 'named'
      },
    },
  });

  return debugTree(rollup, 'ember-glimmer:output');
};

module.exports.handlebarsES = function _handlebars() {
  return new Rollup(findLib('handlebars', 'lib'), {
    annotation: 'handlebars',
    rollup: {
      input: 'handlebars/compiler/base.js',
      output: {
        file: 'handlebars.js',
        format: 'es',
        exports: 'named'
      },
      plugins: [handlebarsFix()]
    }
  });
};

function handlebarsFix() {
  var HANDLEBARS_PARSER = /[\/\\]parser.js$/;
  return {
    load: function(id) {
      if (HANDLEBARS_PARSER.test(id)) {
        var code = readFileSync(id, 'utf8');
        return {
          code: code
            .replace('exports.__esModule = true;', '')
            .replace('exports[\'default\'] = handlebars;', 'export default handlebars;'),

          map: { mappings: null }
        };
      }
    }
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
        exports: 'named'
      },
    }
  });
};

module.exports.backburnerES = function _backburnerES() {
  return funnelLib('backburner.js', 'dist/es6', {
    files: ['backburner.js'],
    annotation: 'backburner es'
  });
};

module.exports.dagES = function _dagES() {
  let lib = funnelLib('dag-map', {
    files: ['dag-map.js'],
    annotation: 'dag-map es'
  });

  return new StringReplace(lib, {
    files: ['dag-map.js'],
    patterns: [{
      match: /\/\/# sourceMappingURL=dag-map.js.map/g,
      replacement: ''
    }],
    annotation: 'remove sourcemap annotation (dag-map)'
  });
};

module.exports.routeRecognizerES = function _routeRecognizerES() {
  return funnelLib('route-recognizer', {
    files: ['route-recognizer.es.js'],
    getDestinationPath() {
      return 'route-recognizer.js';
    },
    annotation: 'route-recognizer es'
  });
};

module.exports.simpleHTMLTokenizerES = function _simpleHTMLTokenizerES() {
  return new Rollup(findLib('simple-html-tokenizer', 'dist/es6'), {
    annotation: 'simple-html-tokenizer es',
    rollup: {
      input: 'index.js',
      output: {
        file: 'simple-html-tokenizer.js',
        format: 'es',
        exports: 'named'
      }
    }
  });
};

module.exports.emberPkgES = function _emberPkgES(name, rollup, externs) {
  if (rollup) {
    return new Rollup(`packages/${name}/lib`, {
      annotation: `rollup ${name}`,
      rollup: {
        input: 'index.js',
        external: externs,
        output: {
          file: `${name}.js`,
          format: 'es',
          exports: 'named'
        }
      }
    });
  }

  return new Funnel(`packages/${name}/lib`, {
    exclude: ['.gitkeep', '**/*.d.ts'],
    destDir: name,
    annotation: `${name} es`
  });
};

const glimmerTrees = new Map();

function rollupGlimmerPackage(pkg) {
  let name = pkg.name;
  let tree = glimmerTrees.get(name);
  if (tree === undefined) {
    tree = new Rollup(pkg.module.dir, {
      rollup: {
        input: pkg.module.base,
        external: pkg.dependencies,
        output: {
          file: name + '.js',
          format: 'es'
        },
      },
      annotation: name
    });
    glimmerTrees.set(name, tree);
  }
  return tree;
}

module.exports.glimmerPkgES = function glimmerPkgES(name) {
  return rollupGlimmerPackage(findPackage(name));
};

module.exports.glimmerTrees = function glimmerTrees(entries) {
  let seen = new Set();

  // glimmer runtime has dependency on this even though it is only in tests
  seen.add('@glimmer/object');
  seen.add('@glimmer/object-reference');

  let trees = [];
  let queue = Array.isArray(entries) ? entries.slice() : [ entries ];
  let name;
  while ((name = queue.pop()) !== undefined) {
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);

    if (!name.startsWith('@glimmer/')) {
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
  return trees;
};

module.exports.emberTestsES = function _emberTestES(name) {
  return new Funnel(`packages/${name}/tests`, {
    exclude: ['.gitkeep'],
    destDir: `${name}/tests`,
    annotation: `${name} tests es`
  });
};

module.exports.nodeModuleUtils = function _nodeModuleUtils() {
  return new Funnel('packages/node-module/lib', {
    files: ['node-module.js']
  });
};

module.exports.emberVersionES = function _emberVersionES() {
  let content = 'export default ' + JSON.stringify(VERSION) + ';\n';
  return new WriteFile('ember/version.js', content, {
    annotation: 'ember/version'
  });
};

module.exports.emberLicense = function _emberLicense() {
  let license = new Funnel('generators', {
    files: ['license.js'],
    annotation: 'license'
  });

  return new StringReplace(license, {
    files: ['license.js'],
    patterns: [{
      match: VERSION_PLACEHOLDER,
      replacement: VERSION
    }],
    annotation: 'license'
  });
};

module.exports.emberFeaturesES = function _emberFeaturesES(production = false) {
  let FEATURES = production ? RELEASE : DEBUG;
  let content = stripIndent`
    import { ENV } from 'ember-environment';
    import { assign } from 'ember-utils';
    export const DEFAULT_FEATURES = ${JSON.stringify(FEATURES)};
    export const FEATURES = assign(DEFAULT_FEATURES, ENV.FEATURES);


    ${Object.keys(toConst(FEATURES)).map((FEATURE) => {
      return `export const ${FEATURE} = FEATURES["${FEATURE.replace(/_/g, '-').toLowerCase()}"];`;
    }).join('\n')}
  `;

  return new WriteFile('ember/features.js', content, {
    annotation: `ember/features ${production ? 'production' : 'debug' }`
  });
};

module.exports.nodeTests = function _nodeTests() {
  return new Funnel('tests', {
    include: ['**/*/*.js']
  });
};

module.exports.rollupEmberMetal = function _rollupEmberMetal(tree, options) {
  options = Object.assign({ transformModules: false, annotation: 'ember metal' }, options);
  let emberMetalES5 = toES5(tree, options);
  return toES5(new Rollup(emberMetalES5, {
    annotation: `rollup ember-metal`,
    rollup: {
      input: `index.js`,
      output: {
        amd: { id: 'ember-metal' },
        file: 'ember-metal.js',
        format: 'amd',
        exports: 'named'
      },
      external: [
        'node-module',
        'ember-babel',
        'ember-debug',
        'ember-environment',
        'ember-utils',
        '@glimmer/reference',
        'require',
        'backburner',
        'ember-console',
        'ember-env-flags',
        'ember/features'
      ]
    }
  }), { transformDefine: true });
};
