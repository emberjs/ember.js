'use strict';

const path = require('path');
const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const bootstrapModule = require('./broccoli/bootstrap-modules');
const concatBundle = require('./broccoli/concat-bundle');
const concat = require('broccoli-concat');
const testIndexHTML = require('./broccoli/test-index-html');
const toES5 = require('./broccoli/to-es5');
const toNamedAMD = require('./broccoli/to-named-amd');
const stripForProd = require('./broccoli/strip-for-prod');
const debugMacros = require('./broccoli/debug-macros');
const minify = require('./broccoli/minify');
const rename = require('./broccoli/rename');
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
  nodeTests,
  buildEmberEnvFlagsES,
  getPackagesES,
} = require('./broccoli/packages');
const BroccoliDebug = require('broccoli-debug');
const ENV = process.env.EMBER_ENV || 'development';

let debugTree = BroccoliDebug.buildDebugCallback('ember-source:ember-cli-build');

module.exports = function() {
  let loader = internalLoader();
  let nodeModule = nodeModuleUtils();

  // generate "loose" ES<latest> modules...
  let dependenciesES = new MergeTrees([
    backburnerES(),
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

    // externalized helpers
    babelHelpers(),
  ]);

  let es = new MergeTrees([packagesES, dependenciesES, templateCompilerDependenciesES], {
    overwrite: true,
  });
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

  // Rollup
  let packagesRollupES = new MergeTrees([
    new Funnel(packagesES, {
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
    rollupPackage(packagesES, '@ember/-internals/browser-environment'),
    rollupPackage(packagesES, '@ember/-internals/environment'),
    rollupPackage(packagesES, '@ember/-internals/glimmer'),
    rollupPackage(packagesES, '@ember/-internals/metal'),
    rollupPackage(packagesES, '@ember/-internals/utils'),
    rollupPackage(packagesES, '@ember/-internals/container'),
  ]);

  // Bundling
  let bundleTrees = [
    buildBundles(packagesRollupES, dependenciesES, templateCompilerDependenciesES),
  ];

  if (ENV === 'production') {
    let bundlesES5 = buildBundles(
      toES5(packagesRollupES),
      toES5(dependenciesES),
      toES5(templateCompilerDependenciesES)
    );

    bundleTrees.push(new Funnel(bundlesES5, { destDir: 'ie' }));
  }

  let emberTestsEmptyTestem = new Funnel('tests', {
    files: ['testem.js'],
    destDir: '',
    annotation: 'tests/testem.js',
  });

  return new MergeTrees([
    new Funnel(es, { destDir: 'es' }),
    ...bundleTrees,
    pkgAndTestESBundleDebug,
    emberTestsEmptyTestem,
    nodeTests(),

    // test harness
    testIndexHTML(),
    jquery(),
    qunit(),
  ]);
};

function buildBundles(packagesES, dependenciesES, templateCompilerDependenciesES) {
  let packagesDevES = debugMacros(packagesES, 'development');
  let dependenciesDevES = debugMacros(dependenciesES, 'development');
  let templateCompilerDependenciesDevES = debugMacros(
    templateCompilerDependenciesES,
    'development'
  );

  let emberDebugFiles = new MergeTrees([
    new Funnel(packagesDevES, {
      exclude: [
        '@ember/-internals/*/tests/**' /* internal packages */,
        '*/*/tests/**' /* scoped packages */,
        '*/tests/**' /* packages */,
        'ember-template-compiler/**',
        'internal-test-helpers/**',
      ],
    }),
    dependenciesDevES,
    bootstrapModule('sideeffects', 'ember'),
  ]);

  let emberTestsFiles = new MergeTrees([
    new Funnel(packagesDevES, {
      include: [
        'internal-test-helpers/**',
        '@ember/-internals/*/tests/**' /* internal packages */,
        '*/*/tests/**' /* scoped packages */,
        '*/tests/**' /* packages */,
        'license.js',
      ],
    }),
    bootstrapModule('empty'),
  ]);

  let emberTestingFiles = new MergeTrees([
    new Funnel(packagesDevES, {
      include: [
        '@ember/debug/lib/**',
        '@ember/debug/index.js',
        'ember-testing/index.js',
        'ember-testing/lib/**',
        'license.js',
      ],
    }),
    bootstrapModule('testing'),
  ]);

  let templateCompilerFiles = new MergeTrees([
    new Funnel(packagesDevES, {
      include: [
        '@ember/-internals/utils.js',
        '@ember/-internals/environment.js',
        '@ember/-internals/browser-environment.js',
        '@ember/canary-features/**',
        '@ember/debug/index.js',
        '@ember/debug/lib/**',
        '@ember/deprecated-features/**',
        '@ember/error/index.js',
        '@ember/polyfills/index.js',
        '@ember/polyfills/lib/**',
        'ember/version.js',
        'ember-template-compiler/**',
      ],
    }),
    templateCompilerDependenciesDevES,
    bootstrapModule('umd', 'ember-template-compiler'),
  ]);

  let emberProdFiles, emberTestsProdFiles;

  if (ENV === 'production') {
    let packagesProdES = stripForProd(debugMacros(packagesES, 'production'));
    let dependenciesProdES = stripForProd(debugMacros(dependenciesES, 'production'));

    emberProdFiles = new MergeTrees([
      new Funnel(packagesProdES, {
        exclude: [
          '@ember/-internals/*/tests/**' /* internal packages */,
          '*/*/tests/**' /* scoped packages */,
          '*/tests/**' /* packages */,
          'ember-template-compiler/**',
          'ember-testing/**',
          'internal-test-helpers/**',
        ],
      }),
      dependenciesProdES,
      bootstrapModule('sideeffects', 'ember'),
    ]);

    emberTestsProdFiles = new MergeTrees([
      new Funnel(packagesProdES, {
        include: [
          'internal-test-helpers/**',
          '*/*/tests/**' /* scoped packages */,
          '*/tests/**' /* packages */,
          'license.js',
        ],
      }),
      bootstrapModule('empty'),
    ]);

    // Note:
    // We have to build custom production template compiler
    // because we strip babel helpers in the prod build
    templateCompilerFiles = stripForProd(templateCompilerFiles);
  }

  // Files that are prebuilt and should not be AMD transformed
  let vendor = [internalLoader(), nodeModuleUtils(), emberLicense()];

  let emberProdBundle = emberProdFiles && buildBundle('ember.prod.js', emberProdFiles, vendor);
  let emberMinBundle =
    emberProdBundle && minify(rename(emberProdBundle, { 'ember.prod.js': 'ember.min.js' }));
  let emberProdTestsBundle =
    emberTestsProdFiles && buildBundle('ember-tests.prod.js', emberTestsProdFiles, vendor);

  return new MergeTrees(
    [
      emberProdBundle,
      emberMinBundle,
      emberProdTestsBundle,
      buildBundle('ember.debug.js', emberDebugFiles, vendor),
      buildBundle('ember-tests.js', emberTestsFiles, vendor),
      buildBundle('ember-testing.js', emberTestingFiles, vendor),
      buildBundle('ember-template-compiler.js', templateCompilerFiles, vendor),
    ].filter(Boolean)
  );
}

function buildBundle(name, tree, extras) {
  let bundleWithExtras = new MergeTrees([toNamedAMD(tree, true), ...extras]);

  return concatBundle(bundleWithExtras, {
    outputFile: name,
  });
}

function glimmerDependenciesES() {
  let glimmerEntries = ['@glimmer/node', '@glimmer/opcode-compiler', '@glimmer/runtime'];

  if (ENV === 'development') {
    let hasGlimmerDebug = true;
    try {
      require.resolve('@glimmer/debug');
    } catch (e) {
      hasGlimmerDebug = false;
    }
    if (hasGlimmerDebug) {
      glimmerEntries.push('@glimmer/debug', '@glimmer/local-debug-flags');
    }
  }
  return glimmerTrees(glimmerEntries);
}

function rollupPackage(packagesES, name) {
  // this prevents broccoli-rollup from "seeing" changes in
  // its input that are unrelated to what we are building
  // and therefore noop on rebuilds...
  let rollupRestrictedInput = new Funnel(packagesES, {
    srcDir: name,
    destDir: name,
  });

  rollupRestrictedInput = debugTree(rollupRestrictedInput, `rollup-package:${name}:input`);

  let output = new Rollup(rollupRestrictedInput, {
    annotation: `rollup ${name}`,
    rollup: {
      input: `${name}/index.js`,
      external(importee, importer) {
        // importer of null/undefined means entry module
        if (!importer) {
          return false;
        }

        // import is relative initially, then expanded to absolute
        // when resolveId is called. this checks for either...
        if (importee[0] === '.' || path.isAbsolute(importee)) {
          return false;
        }

        return true;
      },
      output: {
        sourcemap: 'inline',
        file: `${name}.js`,
        format: 'es',
        exports: 'named',
      },
    },
  });

  return debugTree(output, `rollup-package:${name}:output`);
}
