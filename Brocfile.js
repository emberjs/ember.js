var pickFiles = require('broccoli-static-compiler');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var transpileES6 = require('broccoli-es6-module-transpiler');
var jsHint = require('broccoli-jshint');

var packages = require('./packages');

var dependableTrees = {};

var bower = 'bower_components';

var ES6Tokenizer = pickFiles(bower+'/simple-html-tokenizer/lib/', {
  srcDir: '/',
  destDir: '/'
});
dependableTrees['simple-html-tokenizer'] = ES6Tokenizer;

var ES6Handlebars = pickFiles('node_modules/handlebars/lib/', {
  srcDir: '/handlebars/',
  destDir: '/handlebars/'
});
dependableTrees['handlebars'] = ES6Handlebars;

function getDependencyTree(depName) {
  var dep = dependableTrees[depName];
  if (!dep) {
    dep = getPackageLibTree(depName);
  }
  return dep;
}

function getPackageLibTree(packageName) {
  return moveFile(pickFiles('packages/' + packageName + '/lib', {
    srcDir: '/',
    destDir: '/' + packageName
  }), {
    srcFile: packageName + '/main.js',
    destFile: '/' + packageName + '.js'
  });
};

function getPackageTrees(packageName, dependencies) {
  var libTrees = [];
  // main lib file
  libTrees.push(getPackageLibTree(packageName));
  // dependencies of lib
  for (var i=0;i<(dependencies.lib || []).length;i++) {
    var depName = dependencies.lib[i];
    libTrees.push(getDependencyTree(depName));
  }

  var testTrees = [];
  // main test
  testTrees.push(pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    destDir: '/' + packageName + '-tests'
  }));
  // dependencies of tests
  for (var i=0;i<(dependencies.test || []).length;i++) {
    var depName = dependencies.test[i];
    testTrees.push(getDependencyTree(depName));
  }

  return [libTrees, testTrees];
}


// Test Assets

var test = pickFiles('test', {
  srcDir: '/',
  files: [ 'index.html', 'packages-config.js' ],
  destDir: '/test'
});

test = replace(test, {
  files: [ 'test/packages-config.js' ],
  pattern: {
    match: /\{\{PACKAGES_CONFIG\}\}/g,
    replacement: JSON.stringify(packages, null, 2)
  }
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
var trees = [test, loader, qunit];

var supportTree = pickFiles('test/support', {
  srcDir: '/',
  destDir: '/test/support'
});
var supportCjsTranspiled = transpileES6(supportTree, { type: 'cjs' });
trees.push( supportCjsTranspiled );
var supportES6Transpiled = transpileES6(supportTree, { moduleName: true,type: 'amd' });
trees.push(concatFiles(supportES6Transpiled, {
  inputFiles: ['test/support/**/*.js'],
  outputFile: '/test/test-support.amd.js'
}));

for (var packageName in packages.dependencies) {
  var packageTrees = getPackageTrees(packageName, packages.dependencies[packageName]);

  var libTree = mergeTrees(packageTrees[0]),
      testTree = mergeTrees(packageTrees[1]);

  // AMD lib
  var transpiledAmdLib = transpileES6(libTree, { moduleName: true, type: 'amd' });
  var concatenatedAmdLib = concatFiles(transpiledAmdLib, {
    inputFiles: ['**/*.js'],
    outputFile: '/' + packageName + '.amd.js'
  });
  trees.push(concatenatedAmdLib);

  // CJS lib
  var transpiledCjsLib = transpileES6(libTree, { type: 'cjs' });
  var pickedCjsLib = pickFiles(transpiledCjsLib, {
    srcDir: '/',
    destDir: '/'
  });
  trees.push(pickedCjsLib);
  var pickedCjsMain = pickFiles(transpiledCjsLib, {
    srcDir: packageName+'.js',
    destDir: packageName+'.js'
  });
  trees.push(pickedCjsMain);

  var testTrees = [testTree];

  // jsHint tests
  var jsHintLibTree = pickFiles(libTree, {
    srcDir: packageName+'/',
    destDir: packageName+'/'
  });
  jsHintLibTree = removeFile(jsHintLibTree, {
    srcFile: 'htmlbars-runtime.js' // Uses ES6 `module` syntax. Breaks jsHint
  });
  testTrees.push(jsHint(jsHintLibTree, { destFile: '/' + packageName + '-tests/jshint-lib.js' }));
  var jsHintTestTree = pickFiles(testTree, {
    srcDir: packageName+'-tests/',
    destDir: packageName+'-tests/'
  });
  testTrees.push(jsHint(jsHintTestTree, { destFile: '/' + packageName + '-tests/jshint-tests.js' }));

  // AMD tests
  var transpiledAmdTests = transpileES6(mergeTrees(testTrees), { moduleName: true, type: 'amd' });
  var concatenatedAmdTests = concatFiles(transpiledAmdTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/test/' + packageName + '-tests.amd.js'
  });
  trees.push(concatenatedAmdTests);

  // CJS tests
  var transpiledCjsTests = transpileES6(mergeTrees(testTrees), { type: 'cjs' });
  var movedCjsTests = pickFiles(transpiledCjsTests, {
    srcDir: packageName+'-tests/',
    destDir: '/'+packageName+"-tests/"
  });
  trees.push(movedCjsTests);
}

module.exports = mergeTrees(trees, {overwrite: true});
