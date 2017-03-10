'use strict';
/* eslint-env node */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var fs   = require('fs');
var path = require('path');

var EmberBuild  = require('emberjs-build');
var getPackages = require('./lib/packages');
var getGitInfo  = require('git-repo-info');

var applyFeatureFlags = require('babel-plugin-feature-flags');
var filterImports     = require('babel-plugin-filter-imports');

var vendoredPackage    = require('emberjs-build/lib/vendored-package');
var htmlbarsPackage    = require('emberjs-build/lib/htmlbars-package');
var replaceVersion     = require('emberjs-build/lib/utils/replace-version');

var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');
var MergeTrees = require('broccoli-merge-trees');
var replace = require('broccoli-string-replace');
var uglify = require('broccoli-uglify-sourcemap');
var toAMD = require('./broccoli/to-amd');
var processES2015 = require('./broccoli/process-es2015');
const FEATURES = require('./broccoli/features');
var WriteFile = require('broccoli-file-creator');
var GlimmerTemplatePrecompiler = require('./broccoli/glimmer-template-compiler');
const REMOVE_LIB = /^([^\/]+\/)lib\//;

function dagES() {
  var packageDir = path.dirname(require.resolve('dag-map'));
  var packageJson = require(`${packageDir}/package.json`)
  var { dir, base } = getEntry(packageDir, packageJson);
  // Will pulled a rolled up build
  return new Funnel(dir, {
    files: [base],
    annotation: 'dag-map.js'
  });
}

function backburnerES() {
  var dist = path.dirname(require.resolve('backburner.js'));
  dist = path.join(dist, 'es6');
  // Will pull a rolled up dist
  return new Funnel(dist, {
    files: ['backburner.js']
  });
}

function rsvpES() {
  var lib = path.resolve(path.dirname(require.resolve('rsvp')), '../lib');
  // TODO this should pre-build a rolled up ES6
  var rollup = new Rollup(lib, {
    rollup: {
      entry: 'rsvp.js',
      dest: 'rsvp.js',
      format: 'es',
      exports: 'named'
    },
    annotation: 'rsvp.js'
  });
  return rollup;
}

function getEntry(packageDir, packageJson) {
  var entry = path.join(packageDir, packageJson['module'] || packageJson['jsnext:main'] || packageJson['main'].replace(/dist\//, 'dist/es6/'));
  return { base: path.basename(entry), dir: path.dirname(entry) };
}

function routeRecognizerES() {
  var packageJson = require('route-recognizer/package');
  var packageDir = path.dirname(require.resolve('route-recognizer/package'));
  var { dir, base } = getEntry(packageDir, packageJson);
  // Will pull a rolled up dist
  return new Funnel(dir, {
    files: [ base ]
  });
}

function esPackage(name, options) {
  options = options ? options : {};
  var packageJson = require(name + '/package');
  var packageDir = path.dirname(require.resolve(name + '/package'));

  if (options.entry && !options.srcDir) {
    throw new Error('If resolving from a non-package.json entry point, you must supply the srcDirectory.');
  }

  var entryModule = packageJson['module'] || packageJson['jsnext:main'] || packageJson['main'].replace(/dist\//, 'dist/es6/');
  var funnelDir = path.join(packageDir, options.entry ? options.srcDir : path.dirname(entryModule));
  var sourceEntry = options.entry ? options.entry : path.basename(entryModule);

  var es6 = new Funnel(funnelDir, {
    include: ['**/*.js' ]
  });
  var moduleId = options.moduleId ? options.moduleId : name;
  var destination = options.dest ? options.dest + '.js': moduleId + '.js';
  var external = options.external ? options.external : [];
  var plugins = options.plugins ? options.plugins : [];
  var rolledUp = new Rollup(es6, {
    rollup: {
      external: external,
      entry: sourceEntry,
      dest: destination,
      plugins: plugins,
      format: 'es',
      moduleId: moduleId,
      exports: 'named'
    },
    annotation: destination
  });

  return rolledUp;
}

function routerES() {
  // TODO upstream this to router.js and publish on npm
  return new Rollup(path.resolve(path.dirname(require.resolve('router_js')), '../lib'), {
    rollup: {
      plugins: [{
        transform(code, id) {
          if (/[^t][^e][^r]\/router\.js$/.test(id)) {
            code += 'export { Transition } from \'./router/transition\';\n'
          } else if (/\/router\/handler-info\/[^\/]+\.js$/.test(id)) {
            code = code.replace(/\'router\//g, '\'../');
          }
          code = code.replace(/import\ Promise\ from \'rsvp\/promise\'/g, 'import { Promise } from \'rsvp\'')
          return {
            code: code,
            map: { mappings: '' }
          };
        }
      }],
      external: ['route-recognizer', 'rsvp'],
      entry: 'router.js',
      targets: [{
        dest: 'router.js',
        format: 'es'
      }]
    },
    annotation: 'router.js'
  });
}

// non bundled vendor
function jquery() {
  var jquery = require.resolve('jquery');
  return new Funnel(path.dirname(jquery), {
    files: ['jquery.js'],
    destDir: 'jquery',
    annotation: 'jquery/jquery.js'
  });
}

// TEST files
function qunit() {
  var qunitjs = require.resolve('qunitjs');
  return new Funnel(path.dirname(qunitjs), {
    files: ['qunit.js', 'qunit.css'],
    destDir: 'qunit',
    annotation: 'qunit/qunit.{js|css}'
  });
}

function handlebarsFix() {
  var HANDLEBARS_PARSER = /\/parser.js$/;
  return {
    load: function(id) {
      if (HANDLEBARS_PARSER.test(id)) {
        var code = fs.readFileSync(id, 'utf8');
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

function getESLintRulePaths() {
  var emberjsBuildPath = path.dirname(require.resolve('emberjs-build'));
  var emberjsBuildLinked = emberjsBuildPath.indexOf(__dirname + '/node_modules') === -1;

  if (emberjsBuildLinked) {
    var rulePath = path.join(
      path.dirname(require.resolve('eslint-plugin-ember-internal')),
      'rules'
    );
    return [rulePath];
  }

  return [];
}

function emberES() {
  return new GlimmerTemplatePrecompiler(new Funnel('packages', {
    include: ['*/lib/**/*.js', '*/lib/**/*.hbs'],
    exclude: ['loader/**', 'ember-babel/**', 'internal-test-helpers/**'],
    getDestinationPath(relativePath) {
      return relativePath.replace(REMOVE_LIB, "$1");
    },
    annotation: 'packages ES6'
  }), {
    glimmer: require('@glimmer/compiler')
  });
}

function emberBabelDebugES() {
  return new Funnel('packages/ember-babel/lib', {
    files: ['external-helpers-dev.js'],
    getDestinationPath() {
      return 'ember-babel.js';
    }
  });
}

function emberFeaturesES() {
  let content = Object.keys(FEATURES.DEBUG).map((flag) => {
    return `export const ${flag.replace(/-/g, '_').toUpperCase()} = ${FEATURES.DEBUG[flag] ? 1 : 0};`
  });
  return new WriteFile('ember-features.js', content.join('\n'), {
    annotation: 'ember-features.js (DEBUG)'
  });
}

function emberTemplateCompiler(ember) {
  return toAMD(new Funnel(ember, {
    include: [
      'ember-template-compiler',
      'ember-debug',
      'ember-console',
      'ember-environment',
      'ember-util',
      '@glimmer/compiler',
      '@glimmer/wire-format'
    ].map((pkg) => `${pkg}/**/*.js`)
  }), 'amd/ember-template-compiler.js');
}

function loader() {
  var {dir, base} = path.parse(require.resolve('loader.js'));
  return new Funnel(dir, {
    files: [base]
  })
}

function testIndexHTML() {
  let index = new Funnel('tests', {
    files: ['index.html'],
    annotation: 'index.html'
  });
  index = new replace(index, {
    files: ['index.html'],
    patterns: [{
      match: /\{\{DEV_FEATURES\}\}/g,
      // TODO fix this
      replacement: JSON.stringify(FEATURES.DEBUG)
    }, {
      match: /\{\{PROD_FEATURES\}\}/g,
      replacement: JSON.stringify(FEATURES.RELEASE)
    }],
  });
  index._annotation = 'tests/index.html FEATURES';
  return index;
}

function internalTestHelpers() {
  return new Funnel('packages/internal-test-helpers/lib')
}

module.exports = function() {
  var esSource = new MergeTrees([
    emberES(),
    rsvpES(),
    backburnerES(),
    routerES(),
    dagES(),
    emberFeaturesES(),
    emberBabelDebugES(),
    routeRecognizerES(),
    esPackage('simple-html-tokenizer'),
    esPackage('@glimmer/reference', { external: ['@glimmer/util'] }),
    esPackage('@glimmer/runtime', {
      external: ['@glimmer/util',
                '@glimmer/reference',
                '@glimmer/wire-format',
                '@glimmer/syntax']
    }),
    esPackage('@glimmer/compiler', {
      external: ['@glimmer/syntax', '@glimmer/wire-format', '@glimmer/util']
    }),
    esPackage('@glimmer/di', { external: ['@glimmer/util'] }),
    esPackage('@glimmer/node', { external: ['@glimmer/runtime'] }),
    esPackage('@glimmer/syntax', { external: ['handlebars', 'simple-html-tokenizer'] }),
    esPackage('@glimmer/util', { external: [] }),
    esPackage('@glimmer/wire-format', { external: ['@glimmer/util'] }),
  ]);

  var ES5Ember = processES2015(esSource);

  var AMDDebug = toAMD(ES5Ember, 'amd/ember.debug.js');

  var esTesting = new MergeTrees([
    internalTestHelpers(),
    esPackage('@glimmer/test-helpers', {
      external: ['simple-html-tokenizer',
        '@glimmer/runtime',
        '@glimmer/reference',
        '@glimmer/compiler',
        '@glimmer/util',
        '@glimmer/wire-format'
      ]
    }),
    new Funnel('packages', {
      include:  ['*/tests/**/*.js']
    })
  ]);

  var templateCompiler = emberTemplateCompiler(ES5Ember)

  var testing = new MergeTrees([
    jquery(),
    qunit(),
    loader(),
    testIndexHTML(),
    toAMD(processES2015(esTesting), 'ember-tests.js')
  ]);

  let esSourceDebug = new Funnel(esSource, {
    destDir: 'src/debug'
  });

  let esSourceProd = new Funnel(esSource, {
    destDir: 'src/production'
  });

  testing = new Funnel(testing, {
    destDir: 'tests'
  });

  return new MergeTrees([esSourceDebug, templateCompiler, esSourceProd, testing, AMDDebug]);
}
