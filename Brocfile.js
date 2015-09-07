var Funnel = require('broccoli-funnel');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
var jsHint = require('broccoli-jshint');
var handlebarsInlinedTrees = require('./build-support/handlebars-inliner');
var getVersion = require('git-repo-version');

var packages = require('./packages');

var dependableTrees = {};

var bower = 'bower_components';
var demos = new Funnel('demos', { destDir: '/demos' });

var benchmarkjs = new Funnel('node_modules/benchmark', { files: ['benchmark.js'] });
var benchHarness = 'bench';
var bench = new Funnel(
  mergeTrees([benchmarkjs, benchHarness]),
  { destDir: '/bench' }
);

var ES6Tokenizer = new Funnel(bower+'/simple-html-tokenizer/lib/');
dependableTrees['simple-html-tokenizer'] = ES6Tokenizer;

var npm = 'node_modules';
var MorphRange = new Funnel(npm+'/morph-range/lib/');
dependableTrees['morph-range'] = MorphRange;

dependableTrees['syntax-handlebars-inliner'] = handlebarsInlinedTrees.syntax;
dependableTrees['util-handlebars-inliner'] = handlebarsInlinedTrees.util;

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

var test = new Funnel('tests', {
  srcDir: '/',
  files: [ 'index.html', 'packages-config.js' ],
  destDir: '/tests'
});

test = replace(test, {
  files: [ 'tests/packages-config.js' ],
  pattern: {
    match: /\{\{PACKAGES_CONFIG\}\}/g,
    replacement: JSON.stringify(packages, null, 2)
  }
});

var loader = new Funnel(bower, {
  srcDir: '/loader',
  files: [ 'loader.js' ],
  destDir: '/assets'
});

var qunit = new Funnel(bower, {
  srcDir: '/qunit/qunit',
  destDir: '/tests'
});

var cliSauce = new Funnel('./node_modules/ember-cli-sauce', {
  srcDir: '/vendor',
  files: [ 'export-test-results.js' ],
  destDir: '/tests'
});

// Export trees
var trees = [bench, demos, test, loader, qunit, cliSauce];

for (var packageName in packages.dependencies) {
  var packageTrees = getPackageTrees(packageName, packages.dependencies[packageName]);

  var libTree = mergeTrees(packageTrees[0]);
  var testTree = mergeTrees(packageTrees[1]);

  // ES6
  var pickedEs6Lib = new Funnel(libTree, {
    destDir: '/es6/'
  });
  trees.push(pickedEs6Lib);

  // AMD lib
  var transpiledAmdLib = transpileES6(libTree, 'transpiledAmdLib', {
    modules: 'amdStrict',
  });

  var concatenatedAmdLib = concatFiles(transpiledAmdLib, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/' + packageName + '.amd.js'
  });

  trees.push(concatenatedAmdLib);

  // CJS lib
  var transpiledCjsLib = transpileES6(libTree, 'transpiledCjsLib', {
    modules: 'common',
  });
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
    exclude: [/htmlbars-(syntax|util)\/handlebars/],
    destDir: packageName+'-tests/'
  });
  testTrees.push(jsHint(jsHintLibTree, { destFile: '/' + packageName + '-tests/jshint-lib.js' }));
  testTrees.push(jsHint(testTree, { destFile: '/' + packageName + '-tests/jshint-tests.js' }));

  // AMD tests
  var transpiledAmdTests = transpileES6(mergeTrees(testTrees), 'transpiledAmdTests', {
    modules: 'amdStrict',
  });
  var concatenatedAmdTests = concatFiles(transpiledAmdTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/tests/' + packageName + '-tests.amd.js'
  });
  trees.push(concatenatedAmdTests);

  // CJS tests
  // TODO: renable this, this build file is pretty messy and for some reason
  // this was leaking into the AMD tests. At some future point in time we can
  // restore these.
  //
  // var transpiledCjsTests = transpileES6(mergeTrees(testTrees), 'transpiledCjsTests', {
  //   modules: 'amdStrict',
  // });
  // var movedCjsTests = new Funnel(transpiledCjsTests, {
  //   srcDir: packageName+'-tests/',
  //   destDir: '/cjs/' + packageName + "-tests/"
  // });
  // trees.push(movedCjsTests);
}

trees = replace(mergeTrees(trees, { overwrite: true }), {
  files: [
    'es6/htmlbars.js',
    'es6/htmlbars-compiler/template-compiler.js',
    'amd/htmlbars.js',
    'cjs/htmlbars.js'
  ],
  patterns: [
    { match: /VERSION_STRING_PLACEHOLDER/g, replacement: getVersion() }
  ]
});

module.exports = trees;
