'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const babelHelpers = require('./broccoli/babel-helpers');
const concatBundle = require('./lib/concat-bundle');
const testIndexHTML = require('./broccoli/test-index-html');
const testPolyfills = require('./broccoli/test-polyfills');
const rollupPackage = require('./broccoli/rollup-package');
const minify = require('./broccoli/minify');
const debugTree = require('broccoli-debug').buildDebugCallback('ember-source:ember-cli-build');

Error.stackTraceLimit = Infinity;

const {
  routerES,
  jquery,
  internalLoader,
  qunit,
  handlebarsES,
  rsvpES,
  simpleHTMLTokenizerES,
  backburnerES,
  dagES,
  routeRecognizerES,
  glimmerES,
  glimmerCompilerES,
  emberVersionES,
  emberLicense,
  getPackagesES,
} = require('./broccoli/packages');

const { allSupportedBrowsers, modernBrowsers } = require('./config/browserlists');

const ENV = process.env.EMBER_ENV || 'development';
const SHOULD_ROLLUP = process.env.SHOULD_ROLLUP !== 'false';
const SHOULD_MINIFY = Boolean(process.env.SHOULD_MINIFY);

/**
 * There isn't a way for us to override targets through ember-cli-babel, and we
 * don't want to introduce that functionality for reasons. This is a quick and
 * dirty way for us to accomplish custom targets. This is specifically for:
 *
 * 1. The ember-template-compiler.js file, which should always be built for all
 *    of our supported browsers.
 * 2. The ember.debug.js file, which should always be built for modern browsers.
 *
 * This is not a recommended way of building standard Ember apps.
 */
function withTargets(project, fn) {
  return (tree, isProduction = ENV === 'production', { targets } = {}) => {
    let originalTargets = project.targets;
    if (targets !== undefined) project._targets = targets;

    let transpiled = fn(tree, isProduction);

    project._targets = originalTargets;

    return transpiled;
  };
}

module.exports = function({ project }) {
  let emberSource = project.addons.find(a => a.name === 'ember-source');

  let transpileTree = withTargets(project, emberSource.transpileTree.bind(emberSource));
  let emberBundles = withTargets(project, emberSource.buildEmberBundles.bind(emberSource));

  let packages = debugTree(
    new MergeTrees([
      // dynamically generated packages
      emberVersionES(),

      // packages/** (after typescript compilation)
      getPackagesES(),

      // externalized helpers
      babelHelpers(),
    ]),
    'packages:initial'
  );

  // Rollup
  if (SHOULD_ROLLUP) {
    packages = debugTree(
      new MergeTrees([
        new Funnel(packages, {
          exclude: [
            '@ember/-internals/browser-environment/index.js',
            '@ember/-internals/browser-environment/lib/**',
            '@ember/-internals/container/index.js',
            '@ember/-internals/container/lib/**',
            '@ember/-internals/environment/index.js',
            '@ember/-internals/environment/lib/**',
            '@ember/-internals/glimmer/index.js',
            '@ember/-internals/glimmer/lib/**',
            '@ember/-internals/metal/index.js',
            '@ember/-internals/metal/lib/**',
            '@ember/-internals/utils/index.js',
            '@ember/-internals/utils/lib/**',
          ],
        }),
        rollupPackage(packages, '@ember/-internals/browser-environment'),
        rollupPackage(packages, '@ember/-internals/environment'),
        rollupPackage(packages, '@ember/-internals/glimmer'),
        rollupPackage(packages, '@ember/-internals/metal'),
        rollupPackage(packages, '@ember/-internals/utils'),
        rollupPackage(packages, '@ember/-internals/container'),
      ]),
      'packages:rollup'
    );
  }

  let dist = debugTree(
    new MergeTrees([
      new Funnel(packages, {
        destDir: 'packages',
        exclude: [
          '**/package.json',
          '@ember/-internals/*/tests/**' /* internal packages */,
          '*/*/tests/**' /* scoped packages */,
          '*/tests/**' /* packages */,
          'ember-template-compiler/**',
          'internal-test-helpers/**',
        ],
      }),
      new Funnel(emberHeaderFiles(), { destDir: 'header' }),
      new Funnel(emberDependencies(ENV), { destDir: 'dependencies' }),
    ]),
    'dist'
  );

  // Test builds, tests, and test harness
  let testFiles = debugTree(
    new Funnel(
      new MergeTrees([
        emberBundles(dist),
        testsBundle(packages, ENV, transpileTree),
        testHarness(),
      ]),
      {
        destDir: 'tests',
      }
    ),
    'testFiles'
  );

  let preBuilt = debugTree(
    new Funnel(emberBundles(dist, false, { targets: modernBrowsers, loose: false }), {
      getDestinationPath(path) {
        return path.replace('ember.', 'ember.debug.');
      },
    }),
    'preBuilt'
  );

  if (SHOULD_MINIFY) {
    preBuilt = minify(preBuilt);
  }

  return new MergeTrees([
    // Distributed files
    dist,

    // Pre-built bundles
    preBuilt,
    debugTree(templateCompilerBundle(packages, transpileTree), 'template-compiler'),

    testFiles,
  ]);
};

function emberDependencies(environment) {
  // generate "loose" ES<latest> modules...
  return debugTree(
    new MergeTrees([
      backburnerES(),
      rsvpES(),
      dagES(),
      routerES(),
      routeRecognizerES(),
      glimmerES(environment),
    ]),
    'dependencies'
  );
}

function testsBundle(emberPackages, env, transpileTree) {
  let exclude = env === 'production' ? ['@ember/debug/tests/**', 'ember-testing/tests/**'] : [];

  let emberTestsFiles = transpileTree(
    new MergeTrees([
      new Funnel(emberPackages, {
        include: [
          'internal-test-helpers/**',
          '@ember/-internals/*/tests/**' /* internal packages */,
          '*/*/tests/**' /* scoped packages */,
          '*/tests/**' /* packages */,
          'ember-template-compiler/**',
        ],
        exclude,
      }),
    ])
  );

  return concatBundle(new MergeTrees([emberTestsFiles, emberHeaderFiles()]), {
    outputFile: 'ember-tests.js',
  });
}

function templateCompilerBundle(emberPackages, transpileTree) {
  let templateCompilerFiles = transpileTree(
    new MergeTrees([
      new Funnel(emberPackages, {
        include: [
          '@ember/-internals/utils/**',
          '@ember/-internals/environment/**',
          '@ember/-internals/browser-environment/**',
          '@ember/canary-features/**',
          '@ember/debug/**',
          '@ember/deprecated-features/**',
          '@ember/error/**',
          '@ember/polyfills/**',
          'ember/version.js',
          'ember-babel.js',
          'ember-template-compiler/**',
          'node-module/**',
        ],
        exclude: [
          '@ember/-internals/*/tests/**' /* internal packages */,
          '*/*/tests/**' /* scoped packages */,
          '*/tests/**' /* packages */,
        ],
      }),
      templateCompilerDependencies(),
    ]),
    false,
    { targets: allSupportedBrowsers, loose: false }
  );

  return concatBundle(new MergeTrees([templateCompilerFiles, emberHeaderFiles()]), {
    outputFile: 'ember-template-compiler.js',
    footer:
      '(function (m) { if (typeof module === "object" && module.exports) { module.exports = m } }(require("ember-template-compiler")));',
  });
}

function testHarness() {
  return new MergeTrees([emptyTestem(), testPolyfills(), testIndexHTML(), qunit(), jquery()]);
}

function emptyTestem() {
  return new Funnel('tests', {
    files: ['testem.js'],
    destDir: '',
    annotation: 'tests/testem.js',
  });
}

function templateCompilerDependencies() {
  return new MergeTrees([simpleHTMLTokenizerES(), handlebarsES(), glimmerCompilerES()]);
}

function emberHeaderFiles() {
  return new MergeTrees([emberLicense(), internalLoader()]);
}
