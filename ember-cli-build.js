'use strict';
/* eslint-env node */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

const UnwatchedDir = require('broccoli-source').UnwatchedDir;
const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const babelHelpers = require('./broccoli/babel-helpers');
const bootstrapModule = require('./broccoli/bootstrap-modules');
const addon = require('./broccoli/addon');
const concat = require('./broccoli/concat-bundle');
const testIndexHTML = require('./broccoli/test-index-html');
const toES5 = require('./broccoli/to-es5');
const stripForProd = toES5.stripForProd;
const minify = require('./broccoli/minify');
const lint = require('./broccoli/lint');
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
  glimmerPkgES,
  emberTestsES,
  nodeModuleUtils,
  emberVersionES,
  emberLicense,
  emberFeaturesES,
  packageManagerJSONs,
  nodeTests,
  rollupEmberMetal
} = require('./broccoli/packages');
const SHOULD_ROLLUP = true;

module.exports = function(options) {
  let loader = internalLoader();
  let license = emberLicense();
  let nodeModule = nodeModuleUtils();
  let ENV = process.env.EMBER_ENV || 'development';
  let debugFeatures = toES5(emberFeaturesES());
  let version = toES5(emberVersionES());
  let emberTesting = emberPkgES('ember-testing');
  let emberTestingES5 = toES5(emberTesting, { annotation: 'ember-testing' });
  let emberDebug = emberPkgES('ember-debug');
  let emberDebugES5 = toES5(emberDebug, { annotation: 'ember-debug' });
  let emberTemplateCompiler = emberPkgES('ember-template-compiler');
  let emberTemplateCompilerES5 = toES5(emberTemplateCompiler, { annotation: 'ember-template-compiler' });
  let glimmerSyntax = toES5(
    glimmerPkgES('@glimmer/syntax', ['@glimmer/util', 'handlebars', 'simple-html-tokenizer']),
    { annotation: '@glimmer/syntax' }
  );
  let glimmerCompiler = toES5(
    glimmerPkgES('@glimmer/compiler', ['@glimmer/util', '@glimmer/wire-format', '@glimmer/syntax']),
    { annotation: '@glimmer/compiler' }
  );
  let glimmerReference = toES5(glimmerPkgES('@glimmer/reference', ['@glimmer/util']));
  let glimmerUtil = toES5(glimmerPkgES('@glimmer/util'));
  let glimmerWireFormat = toES5(glimmerPkgES('@glimmer/wire-format', ['@glimmer/util']));
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
  let emberCoreES6 = emberES6();
  let emberTests = emberTestsES6();
  let testHarness = testHarnessFiles();
  let backburner = toES5(backburnerES());

  // Linting
  let packages = new UnwatchedDir('packages');
  let linting = lint(new Funnel(packages, {
    include: ['**/*.js']
  }));

  // ES5
  let dependenciesES5 = dependenciesES6().map(toES5);
  let emberES5 = emberCoreES6.map(toES5);
  emberTests.push(addon('ember-dev', options.project));
  let emberTestsES5 = emberTests.map(toES5);

  // Bundling
  let emberTestsBundle = new MergeTrees([
    ...emberTestsES5,
    linting,
    loader,
    nodeModule,
    license,
    babelDebugHelpersES5,
    lint(emberUtils),
    lint(emberTesting),
    lint(emberDebug),
    lint(emberTemplateCompiler),
    lint(emberMetal),
    lint(emberConsole),
    lint(emberEnvironment),
    lint(container)
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
    glimmerReference,
    glimmerUtil,
    glimmerWireFormat,
    backburner,
    version,
    license,
    loader,
    nodeModule,
    bootstrapModule('ember')
  ];

  emberTestsBundle = concat(emberTestsBundle, {
    outputFile: 'ember-tests.js',
    hasBootstrap: false
  });

  let emberDebugBundle = new MergeTrees([
    ...emberDebugBase,
    emberTestingES5,
    babelDebugHelpersES5,
    inlineParser,
    debugFeatures,
    emberTemplateCompilerES5
  ]);

  emberDebugBundle = concat(emberDebugBundle, {
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

  emberTestingBundle = concat(emberTestingBundle, {
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
      glimmerSyntax,
      glimmerCompiler,
      glimmerReference,
      glimmerUtil,
      glimmerWireFormat,
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
    let babelProdHelpersES5 = toES5(babelHelpers('prod'), { environment: 'production' });
    let productionFeatures = toES5(emberFeaturesES(true), { environment: 'production' });
    let emberMetalProd = stripForProd(rollupEmberMetal(emberMetal, { environment: 'production' }));

    let emberProdES5 = [
      ...emberCoreES6,
      ...dependenciesES6(),
      container,
      emberUtils,
      emberEnvironment,
      emberConsole,
      emberDebug
    ].map((tree) => {
      return stripForProd(toES5(tree, { environment: 'production' }));
    });

    let depsProd = [
      glimmerReference,
      glimmerUtil,
      glimmerWireFormat,
      backburner,
      rsvp
    ].map(stripForProd);

    let emberProdTestES5 = emberTests.map((tree) => {
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
    let prodTemplateCompiler = new MergeTrees(templateCompiler(babelProdHelpersES5));

    prodTemplateCompiler = stripForProd(prodTemplateCompiler)

    prodTemplateCompiler = new MergeTrees([
      nodeModule,
      prodTemplateCompiler,
      version,
      license,
      loader
    ]);

    prodTemplateCompiler = concat(prodTemplateCompiler, {
      outputFile: 'ember-template-compiler.js'
    });

    let emberProdTestsBundle = new MergeTrees([
      ...emberProdTestES5,
      tokenizer,
      emberTemplateCompilerES5,
      babelProdHelpersES5,
      license,
      loader,
      nodeModule
    ]);

    emberRuntimeBundle = concat(emberRuntimeBundle, {
      outputFile: 'ember-runtime.js'
    });

    emberProdBundle = concat(emberProdBundle, {
      outputFile: 'ember.prod.js'
    });

    emberProdTestsBundle = concat(emberProdTestsBundle, {
      outputFile: 'ember-tests.prod.js',
      hasBootstrap: false
    });

    let emberMinBundle = minify(emberProdBundle, 'ember.min');

    trees.push(emberRuntimeBundle, emberProdBundle, emberMinBundle, emberProdTestsBundle, prodTemplateCompiler);
  } else {
    let emberTemplateCompilerBundle = new MergeTrees([
      ...templateCompiler(babelDebugHelpersES5),
        version,
        license,
        loader,
        nodeModule
    ]);

    emberTemplateCompilerBundle = concat(emberTemplateCompilerBundle, {
      outputFile: 'ember-template-compiler.js'
    });

    trees.push(emberTemplateCompilerBundle);
  }

  return new MergeTrees([
    ...trees,
    ...testHarness,
    emberTestsBundle,
    emberDebugBundle,
    emberTestingBundle,
    packageManagerJSONs(),
    nodeTests()
  ]);
};

function dependenciesES6() {
  return [
    dagES(),
    routerES(),
    routeRecognizerES(),
    glimmerPkgES('@glimmer/node', ['@glimmer/runtime']),
    glimmerPkgES('@glimmer/runtime', [
      '@glimmer/util',
      '@glimmer/reference',
      '@glimmer/wire-format'
    ])
  ];
}

function emberTestsES6() {
  return [
    emberPkgES('internal-test-helpers'),
    emberTestsES('container'),
    emberTestsES('ember'),
    emberTestsES('ember-metal'),
    emberTestsES('ember-template-compiler'),
    emberTestsES('ember-glimmer'),
    emberTestsES('ember-application'),
    emberTestsES('ember-debug'),
    emberTestsES('ember-runtime'),
    emberTestsES('ember-extension-support'),
    emberTestsES('ember-routing'),
    emberTestsES('ember-utils'),
    emberTestsES('ember-testing'),
    emberTestsES('internal-test-helpers')
  ];
}

function emberES6() {
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
  return [
    testIndexHTML(),
    jquery(),
    qunit()
  ];
}
