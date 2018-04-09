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
const rename = require('./broccoli/rename');
const { stripIndent } = require('common-tags');
const {
  routerES,
  jquery,
  internalLoader,
  qunit,
  rollupEmberGlimmerES,
  handlebarsES,
  rsvpES,
  simpleHTMLTokenizerES,
  backburnerES,
  dagES,
  routeRecognizerES,
  emberPkgES,
  emberTypescriptPkgES,
  glimmerTrees,
  nodeModuleUtils,
  emberVersionES,
  emberLicense,
  emberFeaturesES,
  nodeTests,
  rollupEmberMetal,
  buildEmberEnvFlagsES,
  getPackagesES,
} = require('./broccoli/packages');
const SHOULD_ROLLUP = true;
const ENV = process.env.EMBER_ENV || 'development';

module.exports = function() {
  let loader = internalLoader();
  let license = emberLicense();
  let nodeModule = nodeModuleUtils();
  let emberGlimmerES = emberTypescriptPkgES('ember-glimmer');

  // generate "loose" ES<latest> modules...
  let combinedES = new MergeTrees([
    // dependencies
    backburnerES(),
    handlebarsES(),
    simpleHTMLTokenizerES(),
    rsvpES(),
    ...dependenciesES({ includeGlimmerCompiler: true }),

    // dynamically generated packages
    emberVersionES(),
    emberFeaturesES(),
    emberLicense(),

    getPackagesES(),
  ]);

  let es = new Funnel(combinedES, {
    destDir: 'es',
  });

  let esMin = minify(
    new Funnel(combinedES, {
      destDir: 'es-min',
    })
  );

  let pkgAndTestESInAMD = toNamedAMD(combinedES);
  let emberEnvFlagsDebug = toNamedAMD(buildEmberEnvFlagsES({ DEBUG: true }));

  let pkgAndTestESBundleDebug = concat(
    new MergeTrees([pkgAndTestESInAMD, loader, nodeModule, emberEnvFlagsDebug]),
    {
      headerFiles: ['loader.js'],
      inputFiles: ['**/*.js'],
      outputFile: 'ember-all.debug.js',
    }
  );

  let debugFeatures = toES5(emberFeaturesES());
  let version = toES5(emberVersionES());
  let emberDebug = emberPkgES('ember-debug');
  let emberDebugES5 = toES5(emberDebug, { annotation: 'ember-debug' });
  let emberTemplateCompiler = emberPkgES('ember-template-compiler');
  let emberTemplateCompilerES5 = toES5(emberTemplateCompiler, {
    annotation: 'ember-template-compiler',
  });
  let babelDebugHelpersES5 = toES5(babelHelpers('debug'), {
    annotation: 'babel helpers debug',
  });
  let inlineParser = toES5(handlebarsES(), { annotation: 'handlebars' });
  let tokenizer = toES5(simpleHTMLTokenizerES(), { annotation: 'tokenizer' });
  let rsvp = toES5(rsvpES(), { annotation: 'rsvp' });
  let emberMetal = new Funnel('packages/ember-metal', {
    destDir: '/',
    include: ['**/*.js'],
    exclude: ['tests'],
  });
  let emberMetalES5 = rollupEmberMetal(emberMetal);
  let emberConsole = emberPkgES('ember-console', SHOULD_ROLLUP, ['ember-environment']);
  let emberConsoleES5 = toES5(emberConsole, { annotation: 'ember-console' });
  let emberEnvironment = emberPkgES('ember-environment');
  let emberEnvironmentES5 = toES5(emberEnvironment, {
    annotation: 'ember-environment',
  });
  let emberUtils = emberPkgES('ember-utils');
  let emberUtilsES5 = toES5(emberUtils, { annotation: 'ember-utils' });
  let container = emberPkgES('container');
  let containerES5 = toES5(container, { annotation: 'container' });
  let emberCoreES = emberES().concat(rollupEmberGlimmerES(emberGlimmerES));
  let testHarness = testHarnessFiles();
  let backburner = toES5(backburnerES());

  // ES5
  let combinedES5 = toES5(combinedES);

  // Bundling
  let emberTestsBundle = new MergeTrees([
    new Funnel(combinedES5, {
      include: ['internal-test-helpers/**', '*/tests/**'],
    }),
    loader,
    license,
    nodeModule,
    babelDebugHelpersES5,
  ]);

  let emberDebugES = new Funnel(combinedES5, {
    include: [
      // dependencies
      '@glimmer/debug.js',
      '@glimmer/encoder.js',
      '@glimmer/local-debug-flags.js',
      '@glimmer/low-level.js',
      '@glimmer/node.js',
      '@glimmer/object.js',
      '@glimmer/object-reference.js',
      '@glimmer/opcode-compiler.js',
      '@glimmer/program.js',
      '@glimmer/reference.js',
      '@glimmer/runtime.js',
      '@glimmer/util.js',
      '@glimmer/vm.js',
      '@glimmer/wire-format.js',
      'backburner.js',
      'dag-map.js',
      'route-recognizer.js',
      'router.js',
      'rsvp.js',

      // packages
      'container/**',
      'ember/**',
      'ember-application/**',
      'ember-console/**',
      'ember-debug/**',
      'ember-environment/**',
      'ember-extension-support/**',
      'ember-glimmer/**',
      'ember-metal/**',
      'ember-routing/**',
      'ember-runtime/**',
      'ember-testing/**',
      'ember-utils/**',
      'ember-views/**',
    ],
    exclude: ['*/tests/**'],
  });

  emberTestsBundle = concatBundle(emberTestsBundle, {
    outputFile: 'ember-tests.js',
    hasBootstrap: false,
  });

  let emberDebugBundle = new MergeTrees([
    emberDebugES,
    license,
    loader,
    nodeModule,
    bootstrapModule('ember'),
    babelDebugHelpersES5,
  ]);

  emberDebugBundle = concatBundle(emberDebugBundle, {
    outputFile: 'ember.debug.js',
  });

  let emberTestingES = new Funnel(combinedES, {
    include: ['ember-debug/**', 'ember-testing/**'],
  });

  let emberTestingBundle = new MergeTrees([
    loader,
    license,
    toES5(emberTestingES),
    babelDebugHelpersES5,
    nodeModule,
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
    `,
  });

  function templateCompiler(babelHelpers) {
    return [
      containerES5,
      emberUtilsES5,
      emberEnvironmentES5,
      emberConsoleES5,
      emberTemplateCompilerES5,
      emberDebugES5,
      // metal depends on @glimmer/reference
      ...glimmerTrees(['@glimmer/compiler', '@glimmer/reference']).map(toES5),
      debugFeatures,
      tokenizer,
      inlineParser,
      babelHelpers,
      bootstrapModule('ember-template-compiler', 'umd'),
    ];
  }

  let trees = [];

  if (ENV === 'production') {
    let babelProdHelpersES5 = toES5(babelHelpers('prod'), {
      environment: 'production',
    });
    let productionFeatures = toES5(emberFeaturesES(true), {
      environment: 'production',
    });
    let emberMetalProd = stripForProd(rollupEmberMetal(emberMetal, { environment: 'production' }));

    let emberProdES5 = [
      ...emberCoreES,
      ...dependenciesES(),
      container,
      emberUtils,
      emberEnvironment,
      emberConsole,
      emberDebug,
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
      bootstrapModule('ember-runtime', 'default'),
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
      bootstrapModule('ember'),
    ]);

    // Note:
    // We have to build custom production template compiler
    // because we strip babel helpers in the prod build
    let prodTemplateCompiler = new MergeTrees(templateCompiler(babelProdHelpersES5));

    prodTemplateCompiler = stripForProd(prodTemplateCompiler);

    prodTemplateCompiler = new MergeTrees([
      nodeModule,
      prodTemplateCompiler,
      version,
      license,
      loader,
    ]);

    prodTemplateCompiler = concatBundle(prodTemplateCompiler, {
      outputFile: 'ember-template-compiler.js',
    });

    let emberProdTestsBundle = new MergeTrees([
      ...emberProdTestES5,
      tokenizer,
      babelProdHelpersES5,
      license,
      loader,
      nodeModule,
    ]);

    emberRuntimeBundle = concatBundle(emberRuntimeBundle, {
      outputFile: 'ember-runtime.js',
    });

    emberProdBundle = concatBundle(emberProdBundle, {
      outputFile: 'ember.prod.js',
    });

    emberProdTestsBundle = concatBundle(emberProdTestsBundle, {
      outputFile: 'ember-tests.prod.js',
      hasBootstrap: false,
    });

    let emberProdMinRename = rename(emberProdBundle, {
      'ember.prod.js': 'ember.min.js',
    });
    let emberMinBundle = minify(emberProdMinRename);

    trees.push(
      emberRuntimeBundle,
      emberProdBundle,
      emberMinBundle,
      emberProdTestsBundle,
      prodTemplateCompiler
    );

    if (process.env.INCLUDE_ES_MIN) {
      trees.push(esMin);
    }
  } else {
    let emberTemplateCompilerBundle = new MergeTrees([
      ...templateCompiler(babelDebugHelpersES5),
      version,
      license,
      loader,
      nodeModule,
    ]);

    emberTemplateCompilerBundle = concatBundle(emberTemplateCompilerBundle, {
      outputFile: 'ember-template-compiler.js',
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
    nodeTests(),
  ]);
};

function dependenciesES(options = {}) {
  let glimmerEntries = ['@glimmer/node', '@glimmer/opcode-compiler', '@glimmer/runtime'];

  if (options.includeGlimmerCompiler) {
    glimmerEntries.push('@glimmer/compiler');
  }

  if (ENV === 'development') {
    let hasGlimmerDebug = true;
    try {
      require('@glimmer/debug'); // eslint-disable-line node/no-missing-require
    } catch (e) {
      hasGlimmerDebug = false;
    }
    if (hasGlimmerDebug) {
      glimmerEntries.push('@glimmer/debug', '@glimmer/local-debug-flags');
    }
  }
  return [dagES(), routerES(), routeRecognizerES(), ...glimmerTrees(glimmerEntries)];
}

function emberES() {
  return [
    emberPkgES('ember-views'),
    emberPkgES('ember'),
    emberPkgES('ember-application'),
    emberPkgES('ember-runtime'),
    emberPkgES('ember-extension-support'),
    emberPkgES('ember-routing'),
  ];
}

function testHarnessFiles() {
  return [testIndexHTML(), jquery(), qunit()];
}
