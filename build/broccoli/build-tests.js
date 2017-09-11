'use strict';

const path = require('path');
const merge = require('broccoli-merge-trees');
const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
const transpileToES5 = require('./transpile-to-es5');
const handlebarsInlinedTrees = require('./handlebars-inliner');
const TSLint = require('broccoli-tslinter');
const Rollup = require('broccoli-rollup');
const babel = require('broccoli-babel-transpiler');

/**
 * For development, this returns a Broccoli tree with:
 *
 * 1. All of Glimmer's AMD modules, concatenated into glimmer-vm.js.
 * 2. Test files as AMD modules.
 * 3. A test harness, including HTML page, QUnit, dependencies, etc.
 */
module.exports = function(tsTree, jsTree, packagesTree) {
  let browserTests = merge([
    transpileBrowserTestsToAMD(tsTree, jsTree),
    includeGlimmerAMD(packagesTree),
    includeVendorDependencies(),
    includeTestHarness()
  ]);

  browserTests = funnel(browserTests, {
    destDir: 'tests'
  });

  let nodeTests = transpileNodeTestsToCommonJS(jsTree);

  return merge([browserTests, nodeTests]);
}

function transpileBrowserTestsToAMD(tsTree, jsTree) {
  let testTree = funnel(jsTree, {
    include: ['@glimmer/!(node)/test/**/*.js']
  });

  // The TSLint plugin passes through all files, so we need to filter out any
  // non-TypeScript files.
  tsTree = funnel(tsTree, {
    include: ['**/*.ts']
  });

  let tslintTestsTree = generateTSLintTests(tsTree);

  testTree = merge([testTree, tslintTestsTree]);
  testTree = transpileToES5(testTree, 'amd');

  return concat(testTree, {
    outputFile: 'assets/tests.js'
  });
}

function transpileNodeTestsToCommonJS(jsTree) {
  let testTree = funnel(jsTree, {
    include: [
      '@glimmer/**/test/**/*-node-test.js'
    ]
  });

  return babel(testTree, {
    sourceMaps: 'inline',
    plugins: [
      'transform-es2015-modules-commonjs'
    ]
  });
}

function generateTSLintTests(tsTree) {
  const tslintConfig = __dirname + '/../../tslint.json';
  return new TSLint(tsTree, {
    configuration: tslintConfig
  });
}

function includeGlimmerAMD(packages) {
  let libAMD = funnel(packages, {
    include: [
      '@glimmer/*/dist/amd/es5/*.js'
    ]
  });

  return concat(libAMD, {
    outputFile: 'assets/glimmer-vm.js'
  });
}

function includeVendorDependencies() {
  let simpleHTMLTokenizer = funnel('node_modules/simple-html-tokenizer/dist/es6', {
    include: ['*.js'],
    destDir: 'simple-html-tokenizer'
  });

  let simpleDOM = new Rollup('node_modules/simple-dom/lib', {
    rollup: {
      format: 'es',
      entry: ['simple-dom.js'],
      dest: 'simple-dom.js'
    }
  });

  let transpiled = transpileES6(merge([simpleHTMLTokenizer, handlebarsInlinedTrees.compiler, simpleDOM]), 'test-dependencies', {
    avoidDefine: false
  });

  return concat(transpiled, {
    outputFile: 'assets/vendor.js'
  })
}

function includeTestHarness() {
  let html = funnel('test', {
    include: ['index.html']
  });

  let loaderPath = path.parse(require.resolve('loader.js'));
  let loader = funnel(loaderPath.dir, {
    files: [ loaderPath.base ],
    destDir: '/assets'
  });

  let qunit = funnel(path.join(require.resolve('qunitjs'), '..'), {
    destDir: 'assets/'
  });

  let harnessTrees = [
    html,
    loader,
    qunit
  ];

  return merge(harnessTrees);
}
