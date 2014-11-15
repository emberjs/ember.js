var Funnel = require('broccoli-funnel');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var transpileES6 = require('broccoli-es6-module-transpiler');
var jsHint = require('broccoli-jshint');
var handlebarsInlineTree = require('./build-support/handlebars-inliner');

var packages = require('./packages');

var dependableTrees = {};

var bower = 'bower_components';

var ES6Tokenizer = new Funnel(bower+'/simple-html-tokenizer/lib/');
dependableTrees['simple-html-tokenizer'] = ES6Tokenizer;

dependableTrees['handlebars-inliner'] = handlebarsInlineTree;

function getDependencyTree(depName) {
  var dep = dependableTrees[depName];
  if (!dep) {
    dep = getPackageLibTree(depName);
  }
  return dep;
}

function getPackageLibTree(packageName) {
  return new Funnel('packages/' + packageName + '/lib', {
    getDestinationPath: function(relativePath) {
      if (relativePath === 'main.js') {
        return packageName + '.js';
      }

      return packageName + '/' + relativePath;
    }
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
  testTrees.push(new Funnel('packages/' + packageName + '/tests', {
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

var test = new Funnel('test', {
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

var loader = new Funnel(bower, {
  srcDir: '/loader',
  files: [ 'loader.js' ],
  destDir: '/test'
});

var qunit = new Funnel(bower, {
  srcDir: '/qunit/qunit',
  destDir: '/test'
});

// Export trees
var trees = [test, loader, qunit];

for (var packageName in packages.dependencies) {
  var packageTrees = getPackageTrees(packageName, packages.dependencies[packageName]);

  var libTree = mergeTrees(packageTrees[0]),
      testTree = mergeTrees(packageTrees[1]);

  // ES6
  var pickedEs6Lib = new Funnel(libTree, {
    destDir: '/es6/'
  });
  trees.push(pickedEs6Lib);

  // AMD lib
  var transpiledAmdLib = transpileES6(libTree, { moduleName: true, type: 'amd' });
  var concatenatedAmdLib = concatFiles(transpiledAmdLib, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/' + packageName + '.amd.js'
  });
  trees.push(concatenatedAmdLib);

  // CJS lib
  var transpiledCjsLib = transpileES6(libTree, { type: 'cjs' });
  var pickedCjsLib = new Funnel(transpiledCjsLib, {
    destDir: '/cjs/'
  });
  trees.push(pickedCjsLib);
  var pickedCjsMain = new Funnel(transpiledCjsLib, {
    srcDir: packageName+'.js',
    destDir: '/cjs/' + packageName+'.js'
  });
  trees.push(pickedCjsMain);

  var testTrees = [testTree];

  // jsHint tests
  var jsHintLibTree = new Funnel(libTree, {
    include: [new RegExp(packageName), new RegExp(packageName + '.+\.js$')],
    exclude: [/htmlbars-compiler\/handlebars/]
  });
  jsHintLibTree = removeFile(jsHintLibTree, {
    srcFile: 'htmlbars-runtime.js' // Uses ES6 `module` syntax. Breaks jsHint
  });
  testTrees.push(jsHint(jsHintLibTree, { destFile: '/' + packageName + '-tests/jshint-lib.js' }));

  var jsHintTestTree = new Funnel(testTree, {
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
  var movedCjsTests = new Funnel(transpiledCjsTests, {
    srcDir: packageName+'-tests/',
    destDir: '/cjs/'+packageName+"-tests/"
  });
  trees.push(movedCjsTests);
}

module.exports = mergeTrees(trees, {overwrite: true});
