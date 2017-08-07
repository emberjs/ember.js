/*jshint node:true*/

const merge = require('broccoli-merge-trees');
const funnel = require('broccoli-funnel');
const { typescript } = require('broccoli-typescript-compiler');

const buildTests = require('./build/broccoli/build-tests');
const buildPackages = require('./build/broccoli/build-packages.js');
const stripGlimmerUtilities = require('./build/broccoli/strip-glimmer-utilities');

const PRODUCTION = process.env.EMBER_ENV === 'production';

/**
 * For development, we build tests and library code only in AMD. For publishing
 * packages, we use @glimmer/build to build each package in multiple formats.
 */
module.exports = function(_options) {
  // First, get all of our TypeScript packages while preserving their relative
  // path in the filesystem. This is important because tsconfig.json paths are
  // relative to the project root and we want to use the tsconfig as-is.
  let tsTree = funnel('packages/@glimmer', {
    destDir: 'packages/@glimmer'
  });

  // Second, compile all of the TypeScript into ES2017 JavaScript. Because the
  // TypeScript compiler understands the project as a whole, it's faster to do
  // this once and use the transpiled JavaScript as the input to any further
  // transformations.
  let jsTree = typescript(tsTree);

  // Glimmer includes a number of assertions and logging information that can be
  // stripped from production builds for better runtime performance.
  if (PRODUCTION) {
    jsTree = stripGlimmerUtilities(jsTree);
  }

  let matrix;

  if (PRODUCTION) {
    matrix = [
      ['amd', 'es5'],
      ['commonjs', 'es2017'],
      ['commonjs', 'es5'],
      ['modules', 'es2017'],
      ['modules', 'es5'],
      ['types']
    ];
  } else {
    matrix = [
      ['amd', 'es5'],
      ['commonjs', 'es5']
    ];
  }

  // Third, build our module/ES combinations for each package.
  let packagesTree = buildPackages(jsTree, matrix);

  let output;

  // Unless we're in production, bundle the tests and test harness. We'll also
  // grab the AMD build of Glimmer and concatenate it into a single
  // glimmer-vm.js file.
  if (PRODUCTION) {
    output = [packagesTree];
  } else {
    let testsTree = buildTests(tsTree, jsTree, packagesTree);
    output = [packagesTree, testsTree];
  }

  return merge(output);
}

function transpileTypeScriptToJavaScript() {
}