/* eslint-env node */

const path = require('path');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const Babel = require('broccoli-babel-transpiler');
const Concat = require('broccoli-concat');
const typescript = require('broccoli-typescript-compiler').default;
const ensurePosix = require('ensure-posix-path');
const moduleResolver = require('amd-name-resolver').resolveModules({
  throwOnRootAccess: false,
});

function findLib(name, libPath) {
  let packagePath = path.join(name, 'package');
  let packageRoot = path.dirname(require.resolve(packagePath));

  libPath = libPath || getLibPath(packagePath);

  return path.resolve(packageRoot, libPath);
}

function getLibPath(packagePath) {
  let packageJson = require(packagePath);

  return path.dirname(packageJson['module'] || packageJson['main']);
}

function getRelativeModulePath(modulePath) {
  return ensurePosix(path.relative(process.cwd(), modulePath));
}
getRelativeModulePath.baseDir = () => __dirname;

function resolveRelativeModulePath(name, child) {
  return moduleResolver(name, getRelativeModulePath(child));
}
resolveRelativeModulePath.baseDir = () => __dirname;

function toAMD(tree) {
  const isProduction = process.env.EMBER_ENV === 'production';
  const isDebug = !isProduction;

  return new Babel(tree, {
    moduleIds: true,
    getModuleId: getRelativeModulePath,
    plugins: [
      ['module-resolver', { resolvePath: resolveRelativeModulePath }],
      ['@babel/plugin-transform-modules-amd', { noInterop: true }],
      [
        'babel-plugin-debug-macros',
        {
          flags: [
            {
              source: '@glimmer/env',
              flags: { DEBUG: isDebug, CI: !!process.env.CI },
            },
          ],
        },
        '@glimmer/env inlining',
      ],
    ],
  });
}

module.exports = function () {
  let ts = 'lib';
  let eslatest = new Funnel(typescript(ts), {
    srcDir: 'lib',
  });

  let amd = toAMD(eslatest);

  let cjs = new Babel(eslatest, {
    plugins: [['@babel/plugin-transform-modules-commonjs']],
  });

  let trees = [
    new Funnel(eslatest, { srcDir: 'router', destDir: 'modules' }),
    new Funnel(cjs, { srcDir: 'router', destDir: 'cjs' }),
  ];

  let tsTests = typescript('tests');

  let testAMD = toAMD(tsTests);

  let concattedTests = new Concat(testAMD, {
    inputFiles: ['**/*.js'],
    outputFile: 'tests/tests.js',
  });

  let concattedAMD = new Concat(amd, {
    inputFiles: ['**/*.js'],
    // putting this in test to avoid publishing
    outputFile: 'tests/router.amd.js',
  });

  let rsvp = new Funnel(findLib('rsvp'), {
    files: ['rsvp.es.js'],
    getDestinationPath() {
      return 'rsvp.js';
    },
  });
  let rsvpAMD = toAMD(rsvp);

  let rr = new Funnel(findLib('route-recognizer'), {
    files: ['route-recognizer.es.js'],
    getDestinationPath() {
      return 'route-recognizer.js';
    },
  });
  let rrAMD = toAMD(rr);

  let backburner = new Funnel(findLib('backburner.js', 'dist/es6'), {
    files: ['backburner.js'],
    annotation: 'backburner es',
  });
  let backburnerAMD = toAMD(backburner);

  let vendorTree = new MergeTrees([rsvpAMD, rrAMD, backburnerAMD]);
  let vendor = new Concat(vendorTree, {
    inputFiles: '**/*.js',
    outputFile: 'vendor/vendor.js',
  });

  trees = trees.concat([
    concattedAMD,

    // dependencies
    new Funnel(findLib('loader.js'), {
      destDir: 'vendor',
      annotation: 'loader.js',
    }),
    new Funnel(findLib('qunit'), {
      files: ['qunit.js', 'qunit.css'],
      destDir: 'vendor',
      annotation: 'qunit',
    }),

    vendor,

    // tests
    new Funnel('tests', {
      files: ['index.html'],
      destDir: 'tests',
    }),

    concattedTests,
  ]);

  return new MergeTrees(trees);
};
