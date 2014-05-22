var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var transpileES6 = require('broccoli-es6-module-transpiler');
var jsHint = require('broccoli-jshint');

var config = require('./bin/config');

var lib = 'lib';
var test = 'test';

var transpiledLib = transpileES6(lib, { moduleName: true });
var concatenatedLib = concatFiles(transpiledLib, {
  inputFiles: ['**/*.js'],
  outputFile: '/htmlbars.amd.js'
});

var tests = pickFiles('test', {
  srcDir: '/tests',
  destDir: '/htmlbars-tests'
});
var jsHintLib = jsHint(lib, { destFile: '/htmlbars-tests/jshint-lib.js' });
var jsHintTests = jsHint(tests, { destFile: '/htmlbars-tests/jshint-tests.js' });
var transpiledTests = transpileES6(tests, { moduleName: true });
var transpiledTestsAndJsHintTests = mergeTrees([transpiledTests, jsHintLib, jsHintTests]);
var concatenatedTests = concatFiles(transpiledTestsAndJsHintTests, {
  inputFiles: ['**/*.js'],
  outputFile: '/test/htmlbars-tests.amd.js'
});

// Testing assets

var vendor = pickFiles('vendor', {
  srcDir: '/',
  destDir: '/vendor'
});

var bower = 'bower_components';

var handlebars = pickFiles(bower, {
  srcDir: '/handlebars',
  files: [ 'handlebars.amd.js' ],
  destDir: '/vendor'
});

var loader = pickFiles(bower, {
  srcDir: '/loader',
  files: [ 'loader.js' ],
  destDir: '/test'
});

var qunit = pickFiles(bower, {
  srcDir: '/qunit/qunit',
  destDir: '/test'
});

var qunitIndex = pickFiles('test', {
  srcDir: '/',
  files: ['index.html'],
  destDir: '/test'
});

module.exports = mergeTrees([concatenatedLib, concatenatedTests, vendor, loader, handlebars, qunit, qunitIndex]);

function getName() {
  return '/htmlbars' + config.version + '.amd.js';
}
