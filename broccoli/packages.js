'use strict';
/* eslint-env node */
const { readFileSync } = require('fs');
const path = require('path');
const Rollup = require('broccoli-rollup');
const Funnel = require('broccoli-funnel');
const filterTypeScript = require('broccoli-typescript-compiler').filterTypeScript;
const BroccoliDebug = require('broccoli-debug');
const findLib = require('./find-lib');
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
      entry: 'index.js',
      targets: [{
        dest: 'router.js',
        format: 'es'
      }]
    },
    annotation: 'router.js'
  });
}


module.exports.jquery = function _jquery() {
  return new Funnel(findLib('jquery'), {
    files: ['jquery.js'],
    destDir: 'jquery',
    annotation: 'jquery'
  });
}

module.exports.internalLoader = function _internalLoader() {
  return new Funnel('packages/loader/lib', {
    files: ['index.js'],
    getDestinationPath() {
      return 'loader.js';
    },
    annotation: 'internal loader'
  });
}

module.exports.qunit = function _qunit() {
  return new Funnel(findLib('qunitjs'), {
    files: ['qunit.js', 'qunit.css'],
    destDir: 'qunit',
    annotation: 'qunit'
  });
}

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

  return debugTree(funneled, 'ember-glimmer:output');
}

module.exports.handlebarsES = function _handlebars() {
  return new Rollup(findLib('handlebars', 'lib'), {
    rollup: {
      entry: 'handlebars/compiler/base.js',
      dest: 'handlebars.js',
      format: 'es',
      exports: 'named',
      plugins: [handlebarsFix()]
    },
    annotation: 'handlebars'
  })
}

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
  }
}

module.exports.rsvpES = function _rsvpES() {
  let lib = path.resolve(path.dirname(require.resolve('rsvp')), '../lib');
  return new Rollup(lib, {
    rollup: {
      entry: 'rsvp.js',
      dest: 'rsvp.js',
      format: 'es',
      exports: 'named'
    },
    annotation: 'rsvp.js'
  });
}

module.exports.backburnerES = function _backburnerES() {
  return funnelLib('backburner.js', 'dist/es6', {
    files: ['backburner.js'],
    annotation: 'backburner es'
  });
}

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
}

module.exports.routeRecognizerES = function _routeRecognizerES() {
  return funnelLib('route-recognizer', {
    files: ['route-recognizer.es.js'],
    getDestinationPath() {
      return 'route-recognizer.js'
    },
    annotation: 'route-recognizer es'
  });
}


module.exports.simpleHTMLTokenizerES = function _simpleHTMLTokenizerES() {
  return new Rollup(findLib('simple-html-tokenizer', 'dist/es6'), {
    rollup: {
      entry: 'index.js',
      dest: 'simple-html-tokenizer.js',
      format: 'es',
      exports: 'named'
    },
    annotation: 'simple-html-tokenizer es'
  })
}

module.exports.emberPkgES = function _emberPkgES(name, rollup, externs) {
  if (rollup) {
    return new Rollup(`packages/${name}/lib`, {
      rollup: {
        entry: 'index.js',
        dest: `${name}.js`,
        external: externs,
        format: 'es',
        exports: 'named'
      },
      annotation: `rollup ${name}`
    });
  }

  return new Funnel(`packages/${name}/lib`, {
    exclude: ['.gitkeep', '**/*.d.ts'],
    destDir: name,
    annotation: `${name} es`
  });
}

module.exports.glimmerPkgES = function _glimmerPkgES(name, externs = []) {
  return new Rollup(findLib(name, 'dist/modules/es5'), {
    rollup: {
      entry: 'index.js',
      dest: `${name}.js`,
      external: externs,
      format: 'es',
      exports: 'named'
    },
    annotation: `${name} es`
  });
}

module.exports.emberTestsES = function _emberTestES(name) {
  return new Funnel(`packages/${name}/tests`, {
    exclude: ['.gitkeep'],
    destDir: `${name}/tests`,
    annotation: `${name} tests es`
  });
}

module.exports.nodeModuleUtils = function _nodeModuleUtils() {
  return new Funnel('packages/node-module/lib', {
    files: ['node-module.js']
  });
}

module.exports.emberVersionES = function _emberVersionES() {
  let content = 'export default ' + JSON.stringify(VERSION) + ';\n';
  return new WriteFile('ember/version.js', content, {
    annotation: 'ember/version'
  });
}

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
}

module.exports.emberFeaturesES = function _emberFeaturesES(production = false) {
  let FEATURES = production ? RELEASE : DEBUG;
  let content = stripIndent`
    import { ENV } from 'ember-environment';
    import { assign } from 'ember-utils';
    export const DEFAULT_FEATURES = ${JSON.stringify(FEATURES)};
    export const FEATURES = assign(DEFAULT_FEATURES, ENV.FEATURES);


    ${Object.keys(toConst(FEATURES)).map((FEATURE) => {
      return `export const ${FEATURE} = FEATURES["${FEATURE.replace(/_/g, '-').toLowerCase()}"];`
    }).join('\n')}
  `;

  return new WriteFile('ember/features.js', content, {
    annotation: `ember/features ${production ? 'production' : 'debug' }`
  });
}

module.exports.packageManagerJSONs = function _packageManagerJSONs() {
  var packageJsons = new Funnel('config/package_manager_files', {
    include: ['*.json'],
    destDir: '/',
    annotation: 'package.json'
  });

  packageJsons = new StringReplace(packageJsons, {
    patterns: [{
      match: VERSION_PLACEHOLDER,
      replacement: VERSION
    }],
    files: ['*.json']
  });
  packageJsons._annotation = 'package.json VERSION';
  return packageJsons;
}

module.exports.nodeTests = function _nodeTests() {
  return new Funnel('tests', {
    include: ['**/*/*.js']
  });
}

module.exports.rollupEmberMetal = function _rollupEmberMetal(tree, options) {
  options = Object.assign({ transformModules: false, annotation: 'ember metal' }, options);
  let emberMetalES5 = toES5(tree, options);
  return toES5(new Rollup(emberMetalES5, {
    rollup: {
      entry: `index.js`,
      dest: `ember-metal.js`,
      moduleId: 'ember-metal',
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
      ],
      format: 'amd',
      exports: 'named'
    },
    annotation: `rollup ember-metal`
  }), { transformDefine: true });
}
