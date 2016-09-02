/* jshint node: true */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var fs = require('fs');
var path = require('path');

var EmberBuild = require('emberjs-build');
var getPackages   = require('./lib/packages');
var getGitInfo = require('git-repo-info');

var applyFeatureFlags = require('babel-plugin-feature-flags');
var filterImports = require('babel-plugin-filter-imports');

var vendoredPackage    = require('emberjs-build/lib/vendored-package');
var htmlbarsPackage    = require('emberjs-build/lib/htmlbars-package');
var vendoredES6Package = require('emberjs-build/lib/es6-vendored-package');

var Funnel = require('broccoli-funnel');
var Rollup = require('broccoli-rollup');

var rollupEnifed = {
  transformBundle(code, options) {
    return {
      code: code.replace(/^define\(/, 'enifed('),
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
  let dist = path.dirname(require.resolve('backburner.js'));
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
    }
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
  var isProduction = (environment === 'production');

  features['mandatory-setter'] = isDevelopment;
  features['ember-glimmer-detect-backtracking-rerender'] = isDevelopment;

  return features;
}

function babelConfigFor(environment) {
  var plugins = [];
  var features = getFeatures(environment);
  var includeDevHelpers = true;

  plugins.push(applyFeatureFlags({
    import: { module: 'ember-metal/features' },
    features: features
  }));

  var isProduction = (environment === 'production');
  if (isProduction) {
    includeDevHelpers = false;
    plugins.push(filterImports({
      'ember-metal/debug': ['assert', 'debug', 'deprecate', 'info', 'runInDebug', 'warn', 'debugSeal']
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

var glimmerEngine = require('glimmer-engine/ember-cli-build')({
  shouldExternalizeHelpers: true,
  stripRuntimeChecks: true
});

var find = require('broccoli-stew').find;

function glimmerPackage(name) {
  return find(glimmerEngine, 'named-amd/' + name + '/**/*.js');
}

function getVersion() {
  var projectPath = process.cwd();
  var info = getGitInfo(projectPath);
  if (info.tag) {
    return info.tag.replace(/^v/, '');
  }

  var packageVersion  = require(path.join(projectPath, 'package.json')).version;
  var sha = info.sha || '';
  var prefix = packageVersion + '-' + (process.env.BUILD_TYPE || info.branch);

  return prefix + '+' + sha.slice(0, 8);
}

module.exports = function() {
  var features = getFeatures();
  var version = getVersion();

  var vendorPackages = {
    'external-helpers':      vendoredPackage('external-helpers'),
    'loader':                vendoredPackage('loader'),
    'rsvp':                  vendoredES6Package('rsvp'),
    'backburner':            backburner(),
    'router':                vendoredES6Package('router.js'),
    'dag-map':               dag(),
    'route-recognizer':      htmlbarsPackage('route-recognizer', { libPath: 'node_modules/route-recognizer/dist/es6/' }),
    'simple-html-tokenizer': htmlbarsPackage('simple-html-tokenizer', { libPath: 'node_modules/glimmer-engine/dist/es6'}),

    'glimmer':              glimmerPackage('glimmer'),
    'glimmer-compiler':     glimmerPackage('glimmer-compiler'),
    'glimmer-reference':    glimmerPackage('glimmer-reference'),
    'glimmer-runtime':      glimmerPackage('glimmer-runtime'),
    'glimmer-node':         glimmerPackage('glimmer-node'),
    'glimmer-syntax':       glimmerPackage('glimmer-syntax'),
    'glimmer-test-helpers': glimmerPackage('glimmer-test-helpers'),
    'glimmer-util':         glimmerPackage('glimmer-util'),
    'glimmer-wire-format':  glimmerPackage('glimmer-wire-format'),
    'handlebars':           glimmerPackage('handlebars') // inlined parser
  };

  var emberBuild = new EmberBuild({
    babel: {
      development: babelConfigFor('development'),
      production: babelConfigFor('production')
    },
    features: {
      development: getFeatures('development'),
      production: getFeatures('production')
    },
    glimmer: require('glimmer-engine'),
    packages: getPackages(features),
    vendoredPackages: vendorPackages,
    version: version
  });

  return emberBuild.getDistTrees();
};

module.exports.getFeatures = getFeatures;
