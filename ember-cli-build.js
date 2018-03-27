'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const babelHelpers = require('./broccoli/babel-helpers');
const bootstrapModule = require('./broccoli/bootstrap-modules');
const concatBundle = require('./broccoli/concat-bundle');
const concat = require('broccoli-concat');
const testIndexHTML = require('./broccoli/test-index-html');
const toES5 = require('./broccoli/to-es5');
const toNamedAMD = require('./broccoli/to-named-amd');
const stripForProd = toES5.stripForProd;
const minify = require('./broccoli/minify');
const { stripIndent } = require('common-tags');
const {
  routerES,
  jquery,
  internalLoader,
  qunit,
  emberGlimmerES,
  handlebarsES,
  rsvpES,
  simpleHTMLTokenizerES,
  backburnerES,
  dagES,
  routeRecognizerES,
  emberPkgES,
  glimmerTrees,
  emberTestsES: emberPkgTestsES,
  nodeModuleUtils,
  emberVersionES,
  emberLicense,
  emberFeaturesES,
  nodeTests,
  rollupEmberMetal,
  buildEmberEnvFlagsES
} = require('./broccoli/packages');
const SHOULD_ROLLUP = true;
const ENV = process.env.EMBER_ENV || 'development';

module.exports = function() {
  let loader = internalLoader();
  let license = emberLicense();
  let nodeModule = nodeModuleUtils();

  // generate "loose" ES<latest> modules...
  let combinedES = new MergeTrees([
    emberVersionES(),
    emberFeaturesES(),
    emberPkgES('ember-testing'),
    emberPkgES('ember-debug'),
    emberPkgES('ember-template-compiler'),
    babelHelpers('debug'),
    backburnerES(),
    handlebarsES(),
    simpleHTMLTokenizerES(),
    rsvpES(),
    emberPkgES('ember-metal'),
    emberPkgES('ember-console'),
    emberPkgES('ember-environment'),
    emberPkgES('ember-utils'),
    emberPkgES('container'),
    ...emberES(),
    ...dependenciesES({ includeGlimmerCompiler: true }),
  ]);

  let es = new Funnel(combinedES, {
    destDir: 'es',
  });

  let emberTestsES = buildEmberTestsES();
  let pkgAndTestES = new MergeTrees([combinedES, ...emberTestsES]);

  let pkgAndTestESInAMD = toNamedAMD(pkgAndTestES);
  let emberEnvFlagsDebug = toNamedAMD(buildEmberEnvFlagsES({ DEBUG: true }));

  let pkgAndTestESBundleDebug = concat(
    new MergeTrees([pkgAndTestESInAMD, loader, nodeModule, emberEnvFlagsDebug]),
    {
      headerFiles: ['loader.js'],
      inputFiles: ['**/*.js'],
      outputFile: 'ember-all.debug.js'
    }
  );

  let debugFeatures = toES5(emberFeaturesES());
  let version = toES5(emberVersionES());
  let emberTesting = emberPkgES('ember-testing');
  let emberTestingES5 = toES5(emberTesting, { annotation: 'ember-testing' });
  let emberDebug = emberPkgES('ember-debug');
  let emberDebugES5 = toES5(emberDebug, { annotation: 'ember-debug' });
  let emberTemplateCompiler = emberPkgES('ember-template-compiler');
  let emberTemplateCompilerES5 = toES5(emberTemplateCompiler, { annotation: 'ember-template-compiler' });
  let babelDebugHelpersES5 = toES5(babelHelpers('debug'), { annotation: 'babel helpers debug' });
  let inlineParser = toES5(handlebarsES(), { annotation: 'handlebars' });
  let tokenizer = toES5(simpleHTMLTokenizerES(), { annotation: 'tokenizer' });
  let rsvp = toES5(rsvpES(), { annotation: 'rsvp' });
  let emberMetal = new Funnel('packages/ember-metal/lib', {
    destDir: '/',
    include: ['**/*.js']
  });
  let emberMetalES5 = rollupEmberMetal(emberMetal);
  let emberConsole = emberPkgES('ember-console', SHOULD_ROLLUP, ['ember-environment']);
  let emberConsoleES5 = toES5(emberConsole, { annotation: 'ember-console' });
  let emberEnvironment = emberPkgES('ember-environment', SHOULD_ROLLUP);
  let emberEnvironmentES5 = toES5(emberEnvironment, { annotation: 'ember-environment' });
  let emberUtils = emberPkgES('ember-utils', SHOULD_ROLLUP);
  let emberUtilsES5 = toES5(emberUtils, { annotation: 'ember-utils' });
  let container = emberPkgES('container', SHOULD_ROLLUP, [
    'ember-debug',
    'ember-utils',
    'ember-environment',
    'ember-env-flags',
    'ember/features'
  ]);
  let containerES5 = toES5(container, { annotation: 'container' });
  let emberCoreES = emberES();
  let testHarness = testHarnessFiles();
  let backburner = toES5(backburnerES());

  // ES5
  let dependenciesES5 = dependenciesES().map(toES5);
  let emberES5 = emberCoreES.map(toES5);
  let emberTestsES5 = emberTestsES.map(toES5);

  // Bundling
  let emberTestsBundle = new MergeTrees([
    ...emberTestsES5,
    loader,
    nodeModule,
    license,
    babelDebugHelpersES5,
  ]);

  let emberDebugBase = [
    ...emberES5,
    ...dependenciesES5,
    rsvp,
    containerES5,
    emberUtilsES5,
    emberEnvironmentES5,
    emberMetalES5,
    emberConsoleES5,
    emberDebugES5,
    backburner,
    version,
    license,
    loader,
    nodeModule,
    bootstrapModule('ember')
  ];

  emberTestsBundle = concatBundle(emberTestsBundle, {
    outputFile: 'ember-tests.js',
    hasBootstrap: false
  });

  let emberDebugBundle = new MergeTrees([
    ...emberDebugBase,
    emberTestingES5,
    babelDebugHelpersES5,
    inlineParser,
    debugFeatures,
  ]);

  emberDebugBundle = concatBundle(emberDebugBundle, {
    outputFile: 'ember.debug.js'
  });

  let emberTestingBundle = new MergeTrees([
    loader,
    license,
    emberTestingES5,
    emberDebugES5,
    babelDebugHelpersES5,
    nodeModule
  ]);

  emberTestingBundle = concatBundle(emberTestingBundle, {
    outputFile: 'ember-testing.js',
    hasBootstrap: false,
    footer: stripIndent`
      var testing = requireModule('ember-testing');
      Ember.Test = testing.Test;
      Ember.Test.Adapter = testing.Adapter;
      Ember.Test.QUnitAdapter = testing.QUnitAdapter;
      Ember.setupForTesting = testing.setupForTesting;
    `
  });

  function templateCompiler(babelHelpers) {
    return [
      containerES5,
      emberUtilsES5,
      emberEnvironmentES5,
      emberMetalES5,
      emberConsoleES5,
      emberTemplateCompilerES5,
      emberDebugES5,
      // metal depends on @glimmer/reference
      ...glimmerTrees(['@glimmer/compiler', '@glimmer/reference']).map(toES5),
      backburner,
      debugFeatures,
      tokenizer,
      inlineParser,
      babelHelpers,
      bootstrapModule('ember-template-compiler', 'umd')
    ];
  }

  let trees = [];

  if (ENV === 'production') {
    let babelProdHelpersES5 = toES5(babelHelpers('prod'), {
      environment: 'production'
    });
    let productionFeatures = toES5(emberFeaturesES(true), {
      environment: 'production'
    });
    let emberMetalProd = stripForProd(
      rollupEmberMetal(emberMetal, { environment: 'production' })
    );

    let emberProdES5 = [
      ...emberCoreES,
      ...dependenciesES(),
      container,
      emberUtils,
      emberEnvironment,
      emberConsole,
      emberDebug
    ].map(tree => {
      return stripForProd(toES5(tree, { environment: 'production' }));
    });

    let depsProd = [backburner, rsvp].map(stripForProd);

    let emberProdTestES5 = emberTestsES.map(tree => {
      return stripForProd(toES5(tree, { environment: 'production' }));
    });

    let emberRuntimeBundle = new MergeTrees([
      loader,
      babelDebugHelpersES5,
      emberMetalES5,
      emberEnvironmentES5,
      emberConsoleES5,
      containerES5,
      rsvp,
      license,
      bootstrapModule('ember-runtime', 'default')
    ]);

    let emberProdBundle = new MergeTrees([
      ...emberProdES5,
      ...depsProd,
      emberMetalProd,
      productionFeatures,
      babelProdHelpersES5,
      version,
      license,
      loader,
      nodeModule,
      bootstrapModule('ember')
    ]);

    // Note:
    // We have to build custom production template compiler
    // because we strip babel helpers in the prod build
    let prodTemplateCompiler = new MergeTrees(
      templateCompiler(babelProdHelpersES5)
    );

    prodTemplateCompiler = stripForProd(prodTemplateCompiler);

    prodTemplateCompiler = new MergeTrees([
      nodeModule,
      prodTemplateCompiler,
      version,
      license,
      loader
    ]);

    prodTemplateCompiler = concatBundle(prodTemplateCompiler, {
      outputFile: 'ember-template-compiler.js'
    });

    let emberProdTestsBundle = new MergeTrees([
      ...emberProdTestES5,
      tokenizer,
      babelProdHelpersES5,
      license,
      loader,
      nodeModule
    ]);

    emberRuntimeBundle = concatBundle(emberRuntimeBundle, {
      outputFile: 'ember-runtime.js'
    });

    emberProdBundle = concatBundle(emberProdBundle, {
      outputFile: 'ember.prod.js'
    });

    emberProdTestsBundle = concatBundle(emberProdTestsBundle, {
      outputFile: 'ember-tests.prod.js',
      hasBootstrap: false
    });

    let emberMinBundle = minify(emberProdBundle, 'ember.min');

    trees.push(
      emberRuntimeBundle,
      emberProdBundle,
      emberMinBundle,
      emberProdTestsBundle,
      prodTemplateCompiler
    );
  } else {
    let emberTemplateCompilerBundle = new MergeTrees([
      ...templateCompiler(babelDebugHelpersES5),
      version,
      license,
      loader,
      nodeModule
    ]);

    emberTemplateCompilerBundle = concatBundle(emberTemplateCompilerBundle, {
      outputFile: 'ember-template-compiler.js'
    });

    trees.push(emberTemplateCompilerBundle);
  }

  return new MergeTrees([
    es,
    pkgAndTestESBundleDebug,
    ...trees,
    ...testHarness,
    emberTestsBundle,
    emberDebugBundle,
    emberTestingBundle,
    nodeTests()
  ]);
};

function dependenciesES(options = {}) {
  let glimmerEntries = [
    '@glimmer/node',
    '@glimmer/opcode-compiler',
    '@glimmer/runtime'
  ];

  if (options.includeGlimmerCompiler) {
    glimmerEntries.push('@glimmer/compiler');
  }

  if (ENV === 'development') {
    let hasGlimmerDebug = true;
    try {
      require('@glimmer/debug');
    } catch (e) {
      hasGlimmerDebug = false;
    }
    if (hasGlimmerDebug) {
      glimmerEntries.push('@glimmer/debug', '@glimmer/local-debug-flags');
    }
  }
  return [
    dagES(),
    routerES(),
    routeRecognizerES(),
    ...glimmerTrees(glimmerEntries)
  ];
}

function buildEmberTestsES() {
  return [
    emberPkgES('internal-test-helpers'),
    emberPkgTestsES('container'),
    emberPkgTestsES('ember'),
    emberPkgTestsES('ember-metal'),
    emberPkgTestsES('ember-template-compiler'),
    emberPkgTestsES('ember-glimmer'),
    emberPkgTestsES('ember-application'),
    emberPkgTestsES('ember-debug'),
    emberPkgTestsES('ember-runtime'),
    emberPkgTestsES('ember-extension-support'),
    emberPkgTestsES('ember-routing'),
    emberPkgTestsES('ember-utils'),
    emberPkgTestsES('ember-testing'),
    emberPkgTestsES('internal-test-helpers')
  ];
}

function emberES() {
  return [
    emberPkgES('ember-views'),
    emberPkgES('ember'),
    emberPkgES('ember-application'),
    emberPkgES('ember-runtime'),
    emberPkgES('ember-extension-support'),
    emberPkgES('ember-routing'),
    emberGlimmerES()
  ];
}

function testHarnessFiles() {
  return [testIndexHTML(), jquery(), qunit()];
}
