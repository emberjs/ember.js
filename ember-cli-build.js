/* jshint node: true */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var fs = require('fs');

var EmberBuild = require('emberjs-build');
var packages   = require('./lib/packages');

var applyFeatureFlags = require('babel-plugin-feature-flags');
var filterImports = require('babel-plugin-filter-imports');

var vendoredPackage    = require('emberjs-build/lib/vendored-package');
var htmlbarsPackage    = require('emberjs-build/lib/htmlbars-package');
var vendoredES6Package = require('emberjs-build/lib/es6-vendored-package');

var featuresJson = fs.readFileSync('./features.json', { encoding: 'utf8' });

function babelConfigFor(environment) {
  var isDevelopment = (environment === 'development');
  var isProduction = (environment === 'production');

  var features = JSON.parse(featuresJson).features;
  features['mandatory-setter'] = isDevelopment;

  var plugins = [];

  plugins.push(applyFeatureFlags({
    import: { module: 'ember-metal/features' },
    features: features
  }));

  if (isProduction) {
    plugins.push(filterImports({
      'ember-metal/debug': ['assert', 'debug', 'deprecate', 'info', 'runInDebug', 'warn', 'debugSeal']
    }));
  }

  return { plugins: plugins };
}

var glimmerEngine = require('glimmer-engine/ember-cli-build')();
var find = require('broccoli-stew').find;
var log = require('broccoli-stew').log;

module.exports = function() {
  var features = JSON.parse(featuresJson).features;

  var vendorPackages = {
    'loader':                vendoredPackage('loader'),
    'rsvp':                  vendoredES6Package('rsvp'),
    'backburner':            vendoredES6Package('backburner'),
    'router':                vendoredES6Package('router.js'),
    'dag-map':               vendoredES6Package('dag-map'),
    'route-recognizer':      htmlbarsPackage('route-recognizer', { libPath: 'node_modules/route-recognizer/dist/es6/' }),
    'dom-helper':            htmlbarsPackage('dom-helper'),
    'morph-range':           htmlbarsPackage('morph-range'),
    'morph-attr':            htmlbarsPackage('morph-attr'),
    'htmlbars-runtime':      htmlbarsPackage('htmlbars-runtime'),
    'htmlbars-compiler':     htmlbarsPackage('htmlbars-compiler'),
    'htmlbars-syntax':       htmlbarsPackage('htmlbars-syntax'),
    'simple-html-tokenizer': htmlbarsPackage('simple-html-tokenizer'),
    'htmlbars-test-helpers': htmlbarsPackage('htmlbars-test-helpers', { singleFile: true }),
    'htmlbars-util':         htmlbarsPackage('htmlbars-util')
  };

  var glimmerStatus = features['ember-glimmer'];
  if (glimmerStatus === null || glimmerStatus === true) {
    vendorPackages['glimmer-engine'] = find(glimmerEngine, {
      include: [
        'amd/glimmer-common.amd.js',
        'amd/glimmer-common.amd.map',
        'amd/glimmer-compiler.amd.js',
        'amd/glimmer-compiler.amd.map',
        'amd/glimmer-runtime.amd.js',
        'amd/glimmer-runtime.amd.map',
      ]
    });

    vendorPackages['glimmer-engine-tests'] = find(glimmerEngine, {
      include: [
        'amd/glimmer-tests.amd.js',
        'amd/glimmer-tests.amd.map'
      ]
    });
  }

  var emberBuild = new EmberBuild({
    babel: {
      development: babelConfigFor('development'),
      production: babelConfigFor('production')
    },
    htmlbars: require('htmlbars'),
    packages: packages,
    vendoredPackages: vendorPackages
  });

  return emberBuild.getDistTrees();
};
