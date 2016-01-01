var concat = require('broccoli-concat');
var merge = require('broccoli-merge-trees');
var typescript = require('broccoli-typescript-compiler');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
var handlebarsInlinedTrees = require('./build-support/handlebars-inliner');
var getVersion = require('git-repo-version');
var stew = require('broccoli-stew');
var mv = stew.mv;
var find = stew.find;

function transpile(tree, label) {
  return transpileES6(tree, label, { resolveModuleSource: null, sourceMaps: 'inline' });
}

module.exports = function() {
  var packages = 'packages/node_modules';

  var bower = 'bower_components';

  var demoTS = merge([
    find('demos', { include: ['**/*.ts']}),
    mv(packages + '/glimmer-test-helpers/lib/environment.ts', 'glimmer-demos/index.ts')
  ]);

  var demoES6 = typescript(demoTS);
  var demoES5 = transpile(demoES6);

  var demoConcat = concat(demoES5, {
    inputFiles: ['**/*.js'],
    outputFile: '/demos/demos.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var benchmarkjs = find('node_modules/benchmark/{benchmark.js}');
  var benchHarness = 'bench';
  var bench = find(
    merge([
      benchmarkjs,
      benchHarness
    ]),
    { destDir: '/demos' }
  );

  var demos = merge([
    find('demos', '*.html'),
    demoConcat,
    bench
  ]);

  // TODO: WAT, why does { } change the output so much....
  var HTMLTokenizer = find(bower + '/simple-html-tokenizer/lib/', { });

  var tsTree = find(packages, {
    include: ["**/*.ts"],
    exclude: ["**/*.d.ts"]
  });

  var jsTree = typescript(tsTree);

  var libTree = find(jsTree, {
    include: ["*/index.js", "*/lib/**/*.js"]
  });

  var packagesTree = merge([
      libTree,
      HTMLTokenizer
  ]);

  var runtimeTree = find(packagesTree, {
    include: ['glimmer-runtime/**/*']
  });

  runtimeTree = merge([
    runtimeTree,
    handlebarsInlinedTrees.runtime
  ]);

  var compilerTree = merge([
    packagesTree,
    handlebarsInlinedTrees.compiler
  ]);

  var testTree = find(jsTree, {
    include: ["*/tests/**/*.js"]
  });

  // Test Assets

  var testHarness = find('tests', {
    srcDir: '/',
    files: [ 'index.html' ],
    destDir: '/tests'
  });

  testHarness = merge([
    testHarness,
    find(bower, {
      srcDir: '/qunit/qunit',
      destDir: '/tests'
    })
  ]);

  var transpiledCompiler = transpile(compilerTree, 'transpiledLibs');
  var transpiledRuntime = transpile(runtimeTree, 'transpiledRuntime');
  var transpiledTests = transpile(testTree, 'transpiledTests');

  var concatenatedCompiler = concat(transpiledCompiler, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-compiler.amd.js',
    sourceMapConfig: {
      enabled: true,
      sourceRoot: '/'
    }
  });

  var concatenatedRuntime = concat(transpiledRuntime, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-runtime.amd.js',
    sourceMapConfig: {
      enabled: true,
      sourceRoot: '/'
    }
  });

  var concatenatedTests = concat(transpiledTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/tests.amd.js',
    sourceMapConfig: {
      enabled: true,
      sourceRoot: '/'
    }
  });

  var loader = find(bower, {
    srcDir: '/loader.js',
    files: [ 'loader.js' ],
    destDir: '/assets'
  });

  var es6Tree = find(packagesTree, {
    destDir: 'es6'
  });

  return merge([
    es6Tree,
    demos,
    concatenatedCompiler,
    concatenatedRuntime,
    loader,
    testHarness,
    concatenatedTests
  ]);
}



