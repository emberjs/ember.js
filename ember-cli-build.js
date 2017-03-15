'use strict';
/* eslint-env node */

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSCS=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

const MergeTrees = require('broccoli-merge-trees');
const babelHelpers = require('./broccoli/babel-helpers');
const bootstrapModule = require('./broccoli/bootstrap-modules');
const addon = require('./broccoli/addon');
const concat = require('./broccoli/concat-bundle');
const testIndexHTML = require('./broccoli/test-index-html');
const toAMD = require('./broccoli/to-amd');
const toES5 = require('./broccoli/to-es5');
const minify = require('./broccoli/minify');
const lint = require('./broccoli/lint');
const {
  routerES,
  jquery,
  internalLoader,
  qunit,
  glimmerDependencyInjectionES,
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
  nodeTests
} = require('./broccoli/packages');
const SHOULD_ROLLUP = true;

module.exports = function(options) {
  let tokenizer = simpleHTMLTokenizerES();
  let container = emberPkgES('container');
  let emberMetal = emberPkgES('ember-metal', SHOULD_ROLLUP, ['ember-debug', 'ember-environment', 'ember-utils', '@glimmer/reference', 'require', 'backburner', 'ember-console']);
  let emberEnvironment = emberPkgES('ember-environment');
  let emberConsole = emberPkgES('ember-console');
  let emberMain = emberPkgES('ember');
  let emberViews =  emberPkgES('ember-views');
  let emberApplication = emberPkgES('ember-application');
  let emberRuntime = emberPkgES('ember-runtime');
  let emberExtensionSupport = emberPkgES('ember-extension-support');
  let emberRouting = emberPkgES('ember-routing');
  let emberGlimmer = emberGlimmerES();
  let internalTestHelpers = emberPkgES('internal-test-helpers');
  let emberUtils = emberPkgES('ember-utils');
  let emberTemplateCompiler = emberPkgES('ember-template-compiler');
  let backburner = backburnerES();
  let glimmerWireFormat = glimmerPkgES('@glimmer/wire-format', ['@glimmer/util']);
  let glimmerSyntax = glimmerPkgES('@glimmer/syntax', ['handlebars', 'simple-html-tokenizer']);
  let glimmerUtil = glimmerPkgES('@glimmer/util');
  let glimmerCompiler = glimmerPkgES('@glimmer/compiler', ['@glimmer/util', '@glimmer/wire-format', '@glimmer/syntax']);
  let glimmerReference = glimmerPkgES('@glimmer/reference', ['@glimmer/util']);
  let glimmerRuntime = glimmerPkgES('@glimmer/runtime', ['@glimmer/util', '@glimmer/reference', '@glimmer/wire-format']);
  let containerTests = emberTestsES('container');
  let emberMainTests =  emberTestsES('ember');
  let emberMetalTests =  emberTestsES('ember-metal');
  let emberTemplateCompilerTests =  emberTestsES('ember-template-compiler');
  let emberGlimmerTests = emberTestsES('ember-glimmer');
  let emberApplicationTests =  emberTestsES('ember-application');
  let emberDebugTests =  emberTestsES('ember-debug');
  let emberRuntimeTests =  emberTestsES('ember-runtime');
  let emberExtensionSupportTests =  emberTestsES('ember-extension-support');
  let emberRoutingTests =  emberTestsES('ember-routing');
  let emberUtilsTests = emberTestsES('ember-utils');
  let emberTestingTests = emberTestsES('ember-testing');
  let internalTestHelpersTests = emberTestsES('internal-test-helpers');
  let emberDebug = emberPkgES('ember-debug');
  let emberTesting = emberPkgES('ember-testing');
  let inlineParser = handlebarsES();
  let loader = internalLoader();
  let rsvp = rsvpES();
  let license = emberLicense();
  let nodeModule = nodeModuleUtils();
  let ENV = process.env.EMBER_ENV || 'development';
  let debugFeatures = emberFeaturesES();
  let productionFeatures = emberFeaturesES(true);
  let version = emberVersionES();

  let emberBaseESNext = [
    glimmerWireFormat,
    glimmerUtil,
    glimmerReference,
    glimmerRuntime,
    container,
    emberConsole,
    emberViews,
    emberDebug,
    emberMetal,
    emberEnvironment,
    emberMain,
    emberApplication,
    emberRuntime,
    emberExtensionSupport,
    emberRouting,
    emberUtils,
    emberGlimmer,
    rsvp,
    backburner,
    version,
    dagES(),
    routerES(),
    routeRecognizerES(),
    glimmerDependencyInjectionES(),
    glimmerPkgES('@glimmer/node', ['@glimmer/runtime']),
    bootstrapModule('ember')
  ];

  let emberTemplateCompilerESNext = [
    container,
    emberEnvironment,
    emberConsole,
    emberTemplateCompiler,
    emberUtils,
    emberDebug,
    debugFeatures,
    emberMetal,
    version,
    tokenizer,
    inlineParser,
    glimmerRuntime,
    backburner,
    glimmerWireFormat,
    glimmerSyntax,
    glimmerUtil,
    glimmerCompiler,
    glimmerReference
  ];

  let emberDebugESNext = [
    ...emberBaseESNext,
    debugFeatures,
    emberTemplateCompiler,
    emberTesting,
    inlineParser
  ];

  let tests = [
    internalTestHelpers,
    containerTests,
    emberMainTests,
    emberMetalTests,
    emberTemplateCompilerTests,
    emberGlimmerTests,
    emberApplicationTests,
    emberDebugTests,
    emberRuntimeTests,
    emberExtensionSupportTests,
    emberRoutingTests,
    emberUtilsTests,
    emberTestingTests,
    internalTestHelpersTests
  ];

  let emberTestsESNext = [
    ...tests,
    ...tests.map(lint),
    addon('ember-dev', options.project)
  ];

  let emberTestingESNext = [
    emberTesting,
    emberDebug
  ];

  let testHarness = [
    testIndexHTML(),
    jquery(),
    qunit()
  ];

  let emberProdTestsESNext = [...emberTestsESNext];

  emberTestingESNext.push(babelHelpers('debug'));
  emberDebugESNext.push(babelHelpers('debug'));

  // ESNext
  emberDebugESNext = new MergeTrees(emberDebugESNext, {
    annotation: 'ember.debug es next'
  });

  emberTemplateCompilerESNext = new MergeTrees(emberTemplateCompilerESNext, {
    annotation: 'ember-template-compiler es next'
  });

  emberTestsESNext = new MergeTrees(emberTestsESNext, {
    annotation: 'ember-tests es next'
  });

  emberTestingESNext = new MergeTrees(emberTestingESNext, {
    annotation: 'ember-testing es next'
  });

  // ES5

  let emberDebugES5 = toES5(emberDebugESNext, {
    annotation: 'ember.debug es5'
  });

  let emberTemplateCompilerES5 = toES5(emberTemplateCompilerESNext, {
    inlineHelpers: true,
    annotation: 'ember-template-compiler es5'
  });

  let emberTestsES5 = toES5(emberTestsESNext, {
    annotation: 'ember-tests es5'
  });

  let emberTestingES5 = toES5(emberTestingESNext, {
    annotation: 'ember-testing es5'
  });

  // AMD

  let emberDebugAMD = toAMD(emberDebugES5, {
    annotation: 'ember.debug amd'
  });

  let emberTemplateCompilerAMD = toAMD(emberTemplateCompilerES5, {
    annotation: 'ember-template-compiler amd'
  });

  let emberTestsAMD = toAMD(emberTestsES5, {
    annotation: 'ember-tests amd'
  });

  let emberTestingAMD = toAMD(emberTestingES5, {
    annotation: 'ember-testing amd'
  });

  // Bundling

  let emberDebugBundle = new MergeTrees([
    license,
    loader,
    emberDebugAMD,
    nodeModule
  ]);

  let emberTemplateCompilerBundle = new MergeTrees([
    license,
    loader,
    emberTemplateCompilerAMD,
    nodeModule,
    bootstrapModule('ember-template-compiler', 'umd')
  ]);

  let emberTestingBundle = new MergeTrees([
    license,
    loader,
    emberTestingAMD,
    nodeModule,
    bootstrapModule('ember-testing')
  ]);

  let emberTestsBundle = new MergeTrees([
    license,
    loader,
    emberTestsAMD,
    nodeModule
  ]);

  emberDebugBundle = concat(emberDebugBundle, {
    outputFile: 'ember.debug.js'
  });

  emberTemplateCompilerBundle = concat(emberTemplateCompilerBundle, {
    outputFile: 'ember-template-compiler.js'
  });

  emberTestsBundle = concat(emberTestsBundle, {
    outputFile: 'ember-tests.js',
    hasBootstrap: false
  });

  emberTestingBundle = concat(emberTestingBundle, {
    outputFile: 'ember-testing.js'
  });

  let prodDist = [];

  if (ENV === 'production') {
    let emberRuntimeESNext = [
      rsvp,
      container,
      emberEnvironment,
      emberConsole,
      emberMetal,
      babelHelpers('debug')
    ];

    emberBaseESNext.push(babelHelpers('prod'));

    emberRuntimeESNext = new MergeTrees(emberRuntimeESNext, {
      annotation: 'ember-runtime es next'
    });

    let emberRuntimeES5 = toES5(emberRuntimeESNext, {
      annotation: 'ember-runtime es5'
    });

    let emberRuntimeAMD = toAMD(emberRuntimeES5, {
      annotation: 'ember-runtime amd'
    });

    let emberRuntimeBundle = new MergeTrees([
      license,
      loader,
      emberRuntimeAMD,
      nodeModule,
      bootstrapModule('ember-runtime', 'default')
    ]);

    emberRuntimeBundle = concat(emberRuntimeBundle, {
      outputFile: 'ember-runtime.js'
    });

    prodDist.push(emberRuntimeBundle);

    emberProdTestsESNext.push(babelHelpers('prod'));

    emberBaseESNext.push(productionFeatures);

    let emberProdBaseESNext = new MergeTrees(emberBaseESNext, {
      annotation: 'ember.prod es next'
    });

    emberProdTestsESNext = new MergeTrees(emberProdTestsESNext, {
       annotation: 'ember-tests.prod es next'
    });

    let emberProdES5 = toES5(emberProdBaseESNext, {
      environment: 'production',
      annotation: 'ember.prod es5'
    });

    let emberProdTestsES5 = toES5(emberProdTestsESNext, {
      environment: 'production',
      annotation: 'ember-test.prod es5'
    });

    let emberProdAMD = toAMD(emberProdES5, {
      environment: 'production',
      annotation: 'ember.prod amd'
    });

    let emberProdTestsAMD = toAMD(emberProdTestsES5, {
      environment: 'production',
      annotation: 'ember-test.prod amd'
    });

    let emberProdBundle = new MergeTrees([
      emberProdAMD,
      loader,
      license,
      nodeModule
    ]);

    let emberProdTestsBundle = new MergeTrees([
      emberProdTestsAMD,
      license,
      loader,
      nodeModule
    ]);

    emberProdBundle = concat(emberProdBundle, {
      outputFile: 'ember.prod.js',
    });

    emberProdTestsBundle = concat(emberProdTestsBundle, {
      outputFile: 'ember-tests.prod.js',
      hasBootstrap: false
    });

    let emberMinBundle = minify(emberProdBundle, 'ember.min');

    prodDist.push(emberProdBundle, emberProdTestsBundle, emberMinBundle);
  }

  let dist = [
    emberDebugBundle,
    emberTemplateCompilerBundle,
    emberTestingBundle,
    emberTestsBundle,
    packageManagerJSONs(),
    nodeTests(),
    ...testHarness,
    ...prodDist
  ];

  return new MergeTrees(dist);
};