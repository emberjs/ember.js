var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-replace');
var transpileES6 = require('broccoli-es6-module-transpiler');
var jsHint = require('broccoli-jshint');

var packages = require('./packages');

function getPackageTrees(packageName) {
  // Lib
  var lib = moveFile(pickFiles('packages/' + packageName + '/lib', {
    srcDir: '/',
    destDir: '/' + packageName
  }), {
    srcFile: packageName + '/main.js',
    destFile: '/' + packageName + '.js'
  });
  var transpiledLib = transpileES6(lib, { moduleName: true });
  var concatenatedLib = concatFiles(transpiledLib, {
    inputFiles: ['**/*.js'],
    outputFile: '/' + packageName + '.amd.js'
  });

  // Tests
  var testSupports = pickFiles('test/support', {
    srcDir: '/',
    destDir: '/test/support'
  });
  var tests = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    destDir: '/' + packageName + '-tests'
  });
  var jsHintLib = jsHint(lib, { destFile: '/' + packageName + '-jshint/lib.js' });
  var jsHintTests = jsHint(tests, { destFile: '/' + packageName + '-jshint/tests.js' });
  var allTests = mergeTrees([testSupports, tests, jsHintLib, jsHintTests]);
  var transpiledTests = transpileES6(allTests, { moduleName: true });
  var concatenatedTests = concatFiles(transpiledTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/test/' + packageName + '-tests.amd.js'
  });

  return [concatenatedLib, concatenatedTests];
}



// Vendored assets

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



// Test Assets

var test = pickFiles('test', {
  srcDir: '/',
  files: [ 'index.html', 'packages-config.js' ],
  destDir: '/test'
});

test = replace(test, {
  files: [ 'test/packages-config.js' ],
  patterns: [{
    match: /\{\{PACKAGES_CONFIG\}\}/g,
    replacement: JSON.stringify(packages, null, 2)
  },
  ]
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



// Export trees

var trees = [vendor, handlebars, test, loader, qunit];

for (var packageName in packages.dependencies) {
  trees = trees.concat(getPackageTrees(packageName));
}

module.exports = mergeTrees(trees);
