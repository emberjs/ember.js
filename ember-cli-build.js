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
var mergeTrees = require('broccoli-merge-trees');
var replace = require('broccoli-string-replace');
var uglify = require('broccoli-uglify-sourcemap');

var rollupEnifed = {
  transformBundle(code, options) {
    return {
      code: code.replace(/\bdefine\(/, 'enifed('),
      map: { mappings: null }
    };
  }
};

function dag() {
  var es = new Funnel(path.dirname(require.resolve('dag-map')), {
    files: ['dag-map.js'],
    annotation: 'dag-map.js'
  });
  return new Rollup(es, {
    rollup: {
      plugins: [rollupEnifed],
      entry: 'dag-map.js',
      dest: 'dag-map.js',
      format: 'amd',
      moduleId: 'dag-map',
      exports: 'named'
    },
    annotation: 'dag-map.js'
  });
}

function backburner() {
  var dist = path.dirname(require.resolve('backburner.js'));
  dist = path.join(dist, 'es6');
  return new Rollup(new Funnel(dist, {
    files: ['backburner.js']
  }), {
    rollup: {
      plugins: [rollupEnifed],
      entry: 'backburner.js',
      dest: 'backburner.js',
      format: 'amd',
      moduleId: 'backburner',
      exports: 'named'
    },
    annotation: 'backburner.js'
  });
}

function rsvp() {
  var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
  var lib = path.resolve(path.dirname(require.resolve('rsvp')), '../lib');
  var rollup = new Rollup(lib, {
    rollup: {
      entry: 'rsvp.js',
      dest: 'rsvp.js',
      format: 'es',
      exports: 'named'
    },
    annotation: 'rsvp.js'
  });
  return transpileES6(rollup);
}

function routeRecognizer() {
  var packageJson = require('route-recognizer/package');
  var packageDir = path.dirname(require.resolve('route-recognizer/package'));
  var entry = path.join(packageDir, packageJson['module'] || packageJson['jsnext:main'] || packageJson['main'].replace(/dist\//, 'dist/es6/'));
  var basename = path.basename(entry);
  var es6 = new Funnel(path.dirname(entry), {
    files: [ basename ]
  });
  return new Rollup(es6, {
    rollup: {
      plugins: [rollupEnifed],
      entry: basename,
      dest: 'route-recognizer.js',
      format: 'amd',
      moduleId: 'route-recognizer',
      exports: 'named'
    },
    annotation: 'route-recognizer.js'
  });
}

function buildPackage(name, options) {
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

  var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');

  return transpileES6(rolledUp, name, {
    stripRuntimeChecks: true
  });
}

function router() {
  return new Rollup(path.resolve(path.dirname(require.resolve('router_js')), '../lib'), {
    rollup: {
      plugins: [rollupEnifed],
      external: ['route-recognizer', 'rsvp'],
      entry: 'router.js',
      dest: 'router.js',
      format: 'amd',
      moduleId: 'router',
      exports: 'named'
    },
    annotation: 'router.js'
  });
}

var featuresJson = fs.readFileSync('./features.json', { encoding: 'utf8' });

function getFeatures(environment) {
  var features = JSON.parse(featuresJson).features;
  var featureName;

  if (process.env.BUILD_TYPE === 'alpha') {
    for (featureName in features) {
      if (features[featureName] === null) {
        features[featureName] = false;
      }
    }
  }

  if (process.env.OVERRIDE_FEATURES) {
    var forcedFeatures = process.env.OVERRIDE_FEATURES.split(',');
    for (var i = 0; i < forcedFeatures.length; i++) {
      featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  features['ember-glimmer-allow-backtracking-rerender'] = false;

  if (process.env.ALLOW_BACKTRACKING) {
    features['ember-glimmer-allow-backtracking-rerender'] = true;
    features['ember-glimmer-detect-backtracking-rerender'] = false;
  }

  var isDevelopment = (environment === 'development');

  features['mandatory-setter'] = isDevelopment;
  features['ember-glimmer-detect-backtracking-rerender'] = isDevelopment;

  return features;
}

function babelConfigFor(environment) {
  var plugins = [];
  var features = getFeatures(environment);
  var includeDevHelpers = true;

  plugins.push(applyFeatureFlags({
    imports: [
      { module: 'ember-debug/features' },
      { module: 'ember-debug', name: 'isFeatureEnabled' },
    ],
    features: features
  }));

  var isProduction = (environment === 'production');
  if (isProduction) {
    includeDevHelpers = false;
    plugins.push(filterImports({
      'ember-debug/deprecate': ['deprecate'],
      'ember-debug': ['assert', 'debug', 'deprecate', 'info', 'runInDebug', 'warn', 'debugSeal', 'debugFreeze']
    }));
  }

  return {
    plugins: plugins,
    includeDevHelpers: includeDevHelpers,
    helperWhiteList: [
      'inherits',
      'class-call-check',
      'tagged-template-literal-loose',
      'slice',
      'defaults',
      'create-class',
      'interop-export-wildcard'
    ]
  };
}

function getVersion() {
  var projectPath = process.cwd();
  var info = getGitInfo(projectPath);
  if (info.tag) {
    return info.tag.replace(/^v/, '');
  }

  var packageVersion  = require(path.join(projectPath, 'package.json')).version;
  var sha = info.sha || '';
  var prefix = packageVersion + '-' + (process.env.BUILD_TYPE || info.branch || process.env.TRAVIS_BRANCH);

  prefix = prefix.replace('master', 'canary');

  return prefix + '+' + sha.slice(0, 8);
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

function treeForAddon(project, name) {
  var addon = project.findAddonByName(name);
  var tree = addon.treeFor('addon');

  return new Funnel(tree, {
    srcDir: 'modules'
  });
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

module.exports = function(options) {
  var features = getFeatures();
  var version = getVersion();

  var vendorPackages = {
    'ember-dev':             treeForAddon(options.project, 'ember-dev'),
    'external-helpers':      vendoredPackage('external-helpers'),
    'loader':                vendoredPackage('loader'),
    'rsvp':                  rsvp(),
    'backburner':            backburner(),
    'router':                router(),
    'dag-map':               dag(),
    'route-recognizer':      routeRecognizer(),
    'simple-html-tokenizer': buildPackage('simple-html-tokenizer'),

    '@glimmer/compiler':     buildPackage('@glimmer/compiler', {
                               external: ['@glimmer/syntax', '@glimmer/wire-format', '@glimmer/util']
                             }),
    '@glimmer/di':           buildPackage('@glimmer/di', { external: ['@glimmer/util'] }),
    '@glimmer/reference':    buildPackage('@glimmer/reference', { external: ['@glimmer/util'] }),
    '@glimmer/runtime':      buildPackage('@glimmer/runtime', {
                               external: ['@glimmer/util',
                                          '@glimmer/reference',
                                          '@glimmer/wire-format',
                                          '@glimmer/syntax']
                             }),
    '@glimmer/node':         buildPackage('@glimmer/node', { external: ['@glimmer/runtime'] }),
    '@glimmer/syntax':       buildPackage('@glimmer/syntax', { external: ['handlebars', 'simple-html-tokenizer'] }),
    '@glimmer/test-helpers': buildPackage('@glimmer/test-helpers'),
    '@glimmer/util':         buildPackage('@glimmer/util', { external: [] }),
    '@glimmer/wire-format':  buildPackage('@glimmer/wire-format', { external: ['@glimmer/util'] }),
    'handlebars':            buildPackage('handlebars', {
                               srcDir: 'lib',
                               entry: 'handlebars/compiler/base.js',
                               plugins: [handlebarsFix()]
                             }) // inlined parser
  };

  // Replace _getBowerTree with one from npm
  EmberBuild.prototype._getBowerTree = function getBowerTree() {
    return mergeTrees([
      qunit(),
      jquery(),
      replaceVersion(new Funnel('config/package_manager_files', {
        destDir: '/'
      }), {
        version: version
      })
    ]);
  };

  EmberBuild.prototype._minifySourceTree = function (tree, options) {
    var srcFile = options.srcFile;
    var destFile = options.destFile;
    var files = [ srcFile ];
    var mapSrcFile = srcFile.slice(0, -2) + 'map';
    var mapDestFile = destFile.slice(0, -2) + 'map';
    if (options.enableSourceMaps) {
      files.push(mapSrcFile);
    }
    // because broccoli-uglify-sourcemap doesn't use persistent filter
    var reducedTree = new Funnel(tree, {
      annotation: 'reduce for minify',
      files: files
    });
    var minifiedTree = new uglify(reducedTree, {
      sourceMapConfig: {
        enabled: options.enableSourceMaps
      },
      mangle: true,
      compress: {
        // this is adversely affects heuristics for IIFE eval
        negate_iife: false,
        // limit sequences because of memory issues during parsing
        sequences: 30
      },
      output: {
        // no difference in size
        // and much easier to debug
        semicolons: false
      }
    });
    return new Funnel(minifiedTree, {
      annotation: 'rename minified',
      files: files,
      getDestinationPath: function(relativePath) {
        if (relativePath === srcFile) {
          return destFile;
        }
        if (relativePath === mapSrcFile) {
          return mapDestFile;
        }
        return relativePath;
      }
    });
  };

  var emberBuild = new EmberBuild({
    babel: {
      development: babelConfigFor('development'),
      production: babelConfigFor('production')
    },
    eslintRulePaths: getESLintRulePaths(),
    features: {
      development: getFeatures('development'),
      production: getFeatures('production')
    },
    glimmer: require('@glimmer/compiler'),
    packages: getPackages(features),
    vendoredPackages: vendorPackages,
    version: version
  });

  return emberBuild.getDistTrees();
};

module.exports.getFeatures = getFeatures;
