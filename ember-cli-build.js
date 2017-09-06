/*jshint node:true*/

const merge = require('broccoli-merge-trees');
const funnel = require('broccoli-funnel');
const { typescript } = require('broccoli-typescript-compiler');

const buildTests = require('./build/broccoli/build-tests');
const buildPackages = require('./build/broccoli/build-packages.js');
const mergeDefinitionFiles = require('./build/broccoli/merge-definition-files');
const stripGlimmerUtilities = require('./build/broccoli/strip-glimmer-utilities');

const PRODUCTION = process.env.EMBER_ENV === 'production';

/**
 * For development, we build for ES5 AMD (browser tests) and CommonJS (Node
 * tests). For production builds, we omit tests but include all target
 * formats.
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

  // The TypeScript compiler doesn't emit `.d.ts` files, so we need to manually
  // merge them back into our JavaScript output.
  jsTree = mergeDefinitionFiles(jsTree);

  // Glimmer includes a number of assertions and logging information that can be
  // stripped from production builds for better runtime performance.
  if (PRODUCTION) {
    jsTree = funnel(jsTree, {
      exclude: ['**/**/-debug-strip.js']
    });
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
