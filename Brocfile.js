var fs  = require('fs');
var util = require('util');
var path = require('path');
var pickFiles = require('broccoli-static-compiler');
var transpileES6 = require('broccoli-es6-module-transpiler');
var mergeTrees = require('broccoli-merge-trees');
var defeatureify = require('broccoli-defeatureify');
var concat = require('broccoli-concat');
var uglifyJavaScript = require('broccoli-uglify-js');
var writeFile = require('broccoli-file-creator');
var moveFile = require('broccoli-file-mover');
var removeFile = require('broccoli-file-remover');
var jshintTree = require('broccoli-jshint');
var replace = require('broccoli-replace');
var es3recast = require('broccoli-es3-safe-recast');

var calculateVersion = require('./lib/calculate-version');

var env = process.env.EMBER_ENV || 'development';
var disableJSHint = !!process.env.NO_JSHINT || false;
var disableDefeatureify = !!process.env.NO_DEFEATUREIFY || env === 'development' || false;

var generateTemplateCompiler = require('./lib/broccoli-ember-template-compiler-generator');
var inlineTemplatePrecompiler = require('./lib/broccoli-ember-inline-template-precompiler');

function defeatureifyConfig(options) {
  var stripDebug = false;
  var options = options || {};
  var configJson = JSON.parse(fs.readFileSync("features.json").toString());

  if (configJson.hasOwnProperty('stripDebug')) { stripDebug = configJson.stripDebug; }
  if (options.hasOwnProperty('stripDebug')) { stripDebug = options.stripDebug; }

  return {
    enabled:           options.features || configJson.features,
    debugStatements:   options.debugStatements || configJson.debugStatements,
    namespace:         options.namespace || configJson.namespace,
    enableStripDebug:  stripDebug
  };
}

function vendoredPackage(packageName) {
  var libTree = pickFiles('packages/' + packageName + '/lib', {
    files: ['main.js'],
    srcDir: '/',
    destDir: '/' + packageName
  });

  return  moveFile(libTree, {
    srcFile: packageName + '/main.js',
    destFile: '/' + packageName + '.js'
  });
};

function concatES6(sourceTrees, options) {
  var loader = vendoredPackages['loader'];
  var inputFiles = options.inputFiles;
  var destFile = options.destFile;

  if (util.isArray(sourceTrees)) {
    sourceTrees = mergeTrees(sourceTrees, {overwrite: true});
  }

  sourceTrees = transpileES6(sourceTrees, {
    moduleName: true
  });

  if (options.es3Safe) {
    sourceTrees = es3recast(sourceTrees);
  }

  if (!disableDefeatureify) {
    sourceTrees = defeatureify(sourceTrees, defeatureifyConfig(options.defeatureifyOptions));
  }

  var concatTrees = [loader, 'generators', iifeStart, iifeStop, sourceTrees];
  if (options.includeLoader === true) {
    inputFiles.unshift('loader.js');
  }

  if (options.bootstrapModule) {
    var bootstrapTree = writeFile('bootstrap', 'requireModule("' + options.bootstrapModule + '");\n');
    concatTrees.push(bootstrapTree);
    inputFiles.push('bootstrap');
  }

  // do not modify inputFiles after here (otherwise IIFE will be messed up)
  if (options.wrapInIIFE !== false) {
    inputFiles.unshift('iife-start');
    inputFiles.push('iife-stop');
  }

  if (options.includeLicense !== false) {
    inputFiles.unshift('license.js');
  }

  if (options.vendorTrees) { concatTrees.push(options.vendorTrees); }

  return concat(mergeTrees(concatTrees), {
    wrapInEval: options.wrapInEval,
    inputFiles: inputFiles,
    outputFile: destFile
  });
}

var testConfig = pickFiles('tests', {
  srcDir: '/',
  files: ['**/*.*'],
  destDir: '/tests'
});

testConfig = replace(testConfig, {
  files: [ 'tests/ember_configuration.js' ],
  patterns: [
    { match: /\{\{FEATURES\}\}/g, replacement: JSON.stringify(defeatureifyConfig().enabled) }
  ]
});

var bowerFiles = [
  pickFiles('config/package_manager_files', {
    srcDir: '/',
    destDir: '/'
  }),

  pickFiles('bower_components/qunit/qunit', {
    srcDir: '/',
    destDir: '/qunit'
  }),

  pickFiles('bower_components/jquery/dist', {
    files: ['jquery.js'],
    srcDir: '/',
    destDir: '/jquery'
  }),

  pickFiles('bower_components/handlebars', {
    files: ['handlebars.js'],
    srcDir: '/',
    destDir: '/handlebars'
  }),
];

bowerFiles = mergeTrees(bowerFiles);

var iifeStart = writeFile('iife-start', '(function() {');
var iifeStop  = writeFile('iife-stop', '})();');

var vendoredPackages = {
  'loader':           vendoredPackage('loader'),
  'rsvp':             rsvp(),
  'metamorph':        vendoredPackage('metamorph'),
  'backburner':       vendoredPackage('backburner'),
  'router':           vendoredPackage('router'),
  'route-recognizer': vendoredPackage('route-recognizer')
};

var emberHandlebarsCompiler = pickFiles('packages/ember-handlebars-compiler/lib', {
  files: ['main.js'],
  srcDir: '/',
  destDir: '/'
});
var templateCompilerTree = generateTemplateCompiler(emberHandlebarsCompiler, { srcFile: 'main.js'});

var packages = require('./lib/packages');

function es6Package(packageName) {
  var pkg = packages[packageName],
      libTree;

  if (pkg['trees']) {
    return pkg['trees'];
  }

  var dependencyTrees = packageDependencyTree(packageName);
  var vendorTrees = packages[packageName].vendorTrees;

  libTree = pickFiles('packages/' + packageName + '/lib', {
    srcDir: '/',
    files: ['**/*.js'],
    destDir: packageName
  });

  libTree = moveFile(libTree, {
    srcFile: packageName + '/main.js',
    destFile: packageName + '.js'
  });

  libTree = mergeTrees([libTree, templateCompilerTree]);
  libTree = inlineTemplatePrecompiler(libTree);
  libTree = removeFile(libTree, {
    srcFile: 'ember-template-compiler.js'
  });

  var libJSHintTree = jshintTree(libTree, {
    destFile: '/' + packageName + '/tests/lib-jshint.js'
  });

  var testTree = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    files: ['**/*.js'],
    destDir: '/' + packageName + '/tests'
  });

  var testJSHintTree = jshintTree(testTree, {
    destFile: '/' + packageName + '/tests/tests-jshint.js'
  });

  var testTrees;
  if (disableJSHint) {
    testTrees = testTree;
  } else {
    testTrees = mergeTrees([testTree, libJSHintTree, testJSHintTree]);
  }

  var compiledLib = concatES6([dependencyTrees, libTree], {
    includeLoader: true,
    vendorTrees: vendorTrees,
    inputFiles: [packageName + '/**/*.js', packageName + '.js'],
    destFile: '/packages/' + packageName + '.js'
  })
  var compiledTrees = [compiledLib];

  var compiledTest = concatES6(testTrees, {
    includeLoader: false,
    inputFiles: ['**/*.js'],
    destFile: '/packages/' + packageName + '-tests.js'
  })
  if (!pkg.skipTests) { compiledTrees.push(compiledTest); }

  compiledTrees = mergeTrees(compiledTrees);

  pkg['trees'] = {lib: libTree, compiledTree: compiledTrees, vendorTrees: vendorTrees};
  if (!pkg.skipTests) { pkg['trees'].tests = testTrees; }

  return pkg.trees;
}

function packageDependencyTree(packageName) {
  var dependencyTrees = packages[packageName]['dependencyTrees'];

  if (dependencyTrees) {
    return dependencyTrees;
  } else {
    dependencyTrees = [];
  }

  var requiredDependencies = packages[packageName]['requirements'] || [];
  var vendoredDependencies = packages[packageName]['vendorRequirements'] || [];
  var libTrees = [];
  var vendorTrees = [];

  vendoredDependencies.forEach(function(dependency) {
    vendorTrees.push(vendoredPackages[dependency]);
  });

  requiredDependencies.forEach(function(dependency) {
    libTrees.concat(packageDependencyTree(dependency));
    libTrees.push(es6Package(dependency).lib);
  }, this);

  packages[packageName]['vendorTrees']            = mergeTrees(vendorTrees, {overwrite: true});
  return packages[packageName]['dependencyTrees'] = mergeTrees(libTrees, {overwrite: true});
}

var vendorTrees          = [];
var devSourceTrees       = [];
var prodSourceTrees      = [];
var testTrees            = [];
var compiledPackageTrees = [];

for (var packageName in packages) {
  es6Package(packageName);
  var currentPackage = packages[packageName];
  var packagesTrees = currentPackage['trees'];

  if (currentPackage['vendorRequirements']) {
    currentPackage['vendorRequirements'].forEach(function(dependency) {
      vendorTrees.push(vendoredPackages[dependency]);
    });
  }

  if (packagesTrees.lib) {
    devSourceTrees.push(packagesTrees.lib);

    if (!currentPackage.developmentOnly) {
      prodSourceTrees.push(packagesTrees.lib);
    }
  }

  if (packagesTrees.compiledTree) {
    compiledPackageTrees.push(packagesTrees.compiledTree);
  }

  if (packagesTrees.tests) {
    testTrees.push(packagesTrees.tests);
  }
}

compiledPackageTrees = mergeTrees(compiledPackageTrees);
vendorTrees = mergeTrees(vendorTrees);
devSourceTrees = mergeTrees(devSourceTrees);
testTrees   = mergeTrees(testTrees);

function rsvp() {
  var tree = pickFiles('bower_components/rsvp/lib', {
    srcDir: '/', destDir: '/'
  });

  var sourceTree = transpileES6(tree, {
    moduleName: true
  });

  if (env !== 'development') {
    sourceTree = es3recast(sourceTree);
  }

  return sourceTree;
}

/*
 Takes devSourceTrees and compiles / concats into ember.js (final output).  If
 non-development will ensure that output is ES3 compliant.
*/
var compiledSource = concatES6(devSourceTrees, {
  es3Safe: env !== 'development',
  includeLoader: true,
  bootstrapModule: 'ember',
  vendorTrees: vendorTrees,
  inputFiles: ['**/*.js'],
  destFile: '/ember.js'
});

function buildRuntimeTree() {
  es6Package('ember-runtime');
  var runtimeTrees = [packages['ember-runtime'].trees.lib];
  var runtimeVendorTrees = packages['ember-runtime'].vendorRequirements.map(function(req){ return vendoredPackages[req] });
  packages['ember-runtime'].requirements.forEach(function(req){
    es6Package(req);
    runtimeTrees.push(packages[req].trees.lib);
    (packages[req].vendorRequirements || []).forEach(function(vreq) {
      runtimeVendorTrees.push(vendoredPackages[vreq]);
    });
  });

  var compiledRuntime = concatES6(mergeTrees(runtimeTrees), {
    includeLoader: true,
    bootstrapModule: 'ember-runtime',
    vendorTrees: mergeTrees(runtimeVendorTrees),
    inputFiles: ['**/*.js'],
    destFile: '/ember-runtime.js'
  });

  return compiledRuntime;
}

// Generates prod build.  defeatureify increases the overall runtime speed of ember.js by
// ~10%.  See defeatureify.
var prodCompiledSource = concatES6(prodSourceTrees, {
  es3Safe: env !== 'development',
  includeLoader: true,
  bootstrapModule: 'ember',
  vendorTrees: vendorTrees,
  inputFiles: ['**/*.js'],
  destFile: '/ember.prod.js',
  defeatureifyOptions: {stripDebug: true}
});

var minCompiledSource = moveFile(prodCompiledSource, {
  srcFile: 'ember.prod.js',
  destFile: 'ember.min.js'
});
minCompiledSource = uglifyJavaScript(minCompiledSource, {
  mangle: true,
  compress: true
});

var compiledTests = concatES6(testTrees, {
  es3Safe: env !== 'development',
  includeLoader: true,
  inputFiles: ['**/*.js'],
  destFile: '/ember-tests.js'
});

var distTrees = [templateCompilerTree, compiledSource, compiledTests, testConfig, bowerFiles];

if (env !== 'development') {
  distTrees.push(prodCompiledSource);
  distTrees.push(minCompiledSource);
  distTrees.push(buildRuntimeTree());
}

distTrees = mergeTrees(distTrees);
distTrees = replace(distTrees, {
  files: [ '**/*.js', '**/*.json' ],
  patterns: [
    { match: /VERSION_STRING_PLACEHOLDER/g, replacement: calculateVersion }
  ]
});

module.exports = distTrees;
