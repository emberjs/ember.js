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
  handlebarsES,
  rsvpES,
  simpleHTMLTokenizerES,
  backburnerES,
  dagES,
  routeRecognizerES,
  glimmerTrees,
  nodeModuleUtils,
  emberVersionES,
  emberLicense,
  emberFeaturesES,
  nodeTests,
  buildEmberEnvFlagsES,
  getPackagesES,
} = require('./broccoli/packages');
const ENV = process.env.EMBER_ENV || 'development';

module.exports = function() {
  let loader = internalLoader();
  let nodeModule = nodeModuleUtils();
  let license = emberLicense();

  // generate "loose" ES<latest> modules...
  let dependenciesES = new MergeTrees([
    backburnerES(),
    handlebarsES(),
    rsvpES(),
    dagES(),
    routerES(),
    routeRecognizerES(),

    ...glimmerDependenciesES(),
  ]);

  let templateCompilerDependenciesES = new MergeTrees([
    simpleHTMLTokenizerES(),
    handlebarsES(),
    ...glimmerTrees(['@glimmer/compiler']),
  ]);

  let packagesES = new MergeTrees([
    // dynamically generated packages
    emberVersionES(),

    // packages/** (after typescript compilation)
    getPackagesES(),
  ]);

  let es = new MergeTrees(
    [packagesES, emberFeaturesES(), dependenciesES, templateCompilerDependenciesES],
    {
      overwrite: true,
    }
  );
  let pkgAndTestESInAMD = toNamedAMD(es);
  let emberEnvFlagsDebug = toNamedAMD(buildEmberEnvFlagsES({ DEBUG: true }));

  let pkgAndTestESBundleDebug = concat(
    new MergeTrees([pkgAndTestESInAMD, loader, nodeModule, emberEnvFlagsDebug]),
    {
      headerFiles: ['loader.js'],
      inputFiles: ['**/*.js'],
      outputFile: 'ember-all.debug.js',
    }
  );

  let babelDebugHelpersES5 = toES5(babelHelpers('debug'), {
    annotation: 'babel helpers debug',
  });

  // ES5
  let packagesES5 = toES5(packagesES);
  let dependenciesES5 = toES5(dependenciesES);
  let templateCompilerDependenciesES5 = toES5(templateCompilerDependenciesES);
  let emberDebugFeaturesES5 = toES5(emberFeaturesES());

  // Bundling
  let emberTestsBundle = new MergeTrees([
    new Funnel(packagesES5, {
      include: ['internal-test-helpers/**', '*/tests/**', 'license.js'],
    }),
    loader,
    license,
    nodeModule,
    babelDebugHelpersES5,
  ]);

  emberTestsBundle = concatBundle(emberTestsBundle, {
    outputFile: 'ember-tests.js',
    hasBootstrap: false,
  });

  let emberDebugBundle = new MergeTrees([
    new Funnel(packagesES5, {
      exclude: ['*/tests/**', 'ember-template-compiler/**'],
    }),
    dependenciesES5,
    emberDebugFeaturesES5,
    loader,
    license,
    nodeModule,
    bootstrapModule('ember'),
    babelDebugHelpersES5,
  ]);

  emberDebugBundle = concatBundle(emberDebugBundle, {
    outputFile: 'ember.debug.js',
  });

  let emberTestingBundle = new MergeTrees([
    new Funnel(packagesES5, {
      include: ['ember-debug/**', 'ember-testing/**', 'license.js'],
    }),
    loader,
    license,
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

  function templateCompiler() {
    return new MergeTrees([
      new Funnel(packagesES5, {
        include: [
          'ember/version.js',
          'ember-debug/**',
          'ember-environment/**',
          'ember-template-compiler/**',
          'ember-utils/**',
        ],
      }),
      bootstrapModule('ember-template-compiler', 'umd'),
    ]);
  }

  let trees = [];

  if (ENV === 'production') {
    let prodPackagesES5 = stripForProd(toES5(packagesES, { environment: 'production' }));
    let babelProdHelpersES5 = toES5(babelHelpers('prod'), {
      environment: 'production',
    });
    let productionFeatures = toES5(emberFeaturesES(true), {
      environment: 'production',
    });

    let emberProdBundle = new MergeTrees([
      new Funnel(prodPackagesES5, {
        exclude: ['*/tests/**', 'ember-template-compiler/**'],
      }),
      stripForProd(dependenciesES5),
      loader,
      license,
      nodeModule,
      bootstrapModule('ember'),
      babelProdHelpersES5,
      productionFeatures,
    ]);

    emberProdBundle = concatBundle(emberProdBundle, {
      outputFile: 'ember.prod.js',
    });
    trees.push(emberProdBundle);

    let emberProdMinRename = rename(emberProdBundle, {
      'ember.prod.js': 'ember.min.js',
    });
    let emberMinBundle = minify(emberProdMinRename);
    trees.push(emberMinBundle);

    let emberTestsBundle = new MergeTrees([
      new Funnel(prodPackagesES5, {
        include: ['internal-test-helpers/**', '*/tests/**', 'license.js'],
      }),
      loader,
      license,
      nodeModule,
      babelProdHelpersES5,
    ]);

    emberTestsBundle = concatBundle(emberTestsBundle, {
      outputFile: 'ember-tests.prod.js',
      hasBootstrap: false,
    });
    trees.push(emberTestsBundle);

    // Note:
    // We have to build custom production template compiler
    // because we strip babel helpers in the prod build
    let emberTemplateCompilerBundle = new MergeTrees([
      stripForProd(templateCompiler()),
      stripForProd(templateCompilerDependenciesES5),
      loader,
      license,
      babelProdHelpersES5,
      nodeModule,
      productionFeatures,
    ]);

    emberTemplateCompilerBundle = concatBundle(emberTemplateCompilerBundle, {
      outputFile: 'ember-template-compiler.js',
    });
    trees.push(emberTemplateCompilerBundle);
  } else {
    let emberTemplateCompilerBundle = new MergeTrees([
      templateCompiler(),
      templateCompilerDependenciesES5,
      loader,
      license,
      babelDebugHelpersES5,
      nodeModule,
      emberDebugFeaturesES5,
    ]);

    emberTemplateCompilerBundle = concatBundle(emberTemplateCompilerBundle, {
      outputFile: 'ember-template-compiler.js',
    });

    trees.push(emberTemplateCompilerBundle);
  }

  return new MergeTrees([
    new Funnel(es, { destDir: 'es' }),
    pkgAndTestESBundleDebug,
    ...trees,
    emberTestsBundle,
    emberDebugBundle,
    emberTestingBundle,
    nodeTests(),

    // test harness
    testIndexHTML(),
    jquery(),
    qunit(),
  ]);
};

function glimmerDependenciesES() {
  let glimmerEntries = ['@glimmer/node', '@glimmer/opcode-compiler', '@glimmer/runtime'];

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
  return glimmerTrees(glimmerEntries);
}
