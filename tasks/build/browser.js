var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var jsHint = require('broccoli-jshint');

var lib = 'lib';

var tests = pickFiles('test', {
  srcDir: '/tests',
  destDir: '/htmlbars/tests'
});

var src = mergeTrees([lib, tests]);

var jsHintTests = jsHint(src, {
  destFile: '/htmlbars/tests/jshint-test.js'
});

src = mergeTrees([src, jsHintTests]);

var transpiled = transpileES6(src, { moduleName: true });
var concatted = concatFiles(transpiled, {
  inputFiles: ['**/*.js'],
  outputFile: '/htmlbars-and-tests.amd.js'
});

// Testing assets

var vendor = pickFiles('vendor', {
  srcDir: '/',
  destDir: '/vendor'
});

var qunit = pickFiles('test', {
  srcDir: '/',
  files: ['qunit.js', 'qunit.css'],
  destDir: '/'
});

var qunitIndex = pickFiles('test', {
  srcDir: '/',
  files: ['index.html'],
  destDir: '/'
});

module.exports = mergeTrees([concatted, vendor, qunitIndex, qunit]);
