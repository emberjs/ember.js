var Funnel = require('broccoli-funnel');
var concat = require('broccoli-concat');
var merge = require('broccoli-merge-trees');
var typescript = require('broccoli-typescript-compiler');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
var handlebarsInlinedTrees = require('./build-support/handlebars-inliner');
var getVersion = require('git-repo-version');
var stew = require('broccoli-stew');
var mv = stew.mv;

module.exports = function() {
  function transpile(tree, label) {
    return transpileES6(tree, label, { resolveModuleSource: null, sourceMaps: 'inline' });
  }

  var packages = 'packages/node_modules';

  var bower = 'bower_components';
  var demoHTML = new Funnel('demos', {
    include: ['*.html'],
    destDir: '/demos'
  });

  var demoTS = merge([
    new Funnel('demos', {
      include: ['**/*.ts']
    }),
    mv(packages + '/glimmer-test-helpers/lib/environment.ts', 'glimmer-demos/index.ts')
  ]);

  var demoES6 = typescript(demoTS);
  var demoES5 = transpile(demoES6);

  var demoConcat = concat(demoES5, {
    inputFiles: ['**/*.js'],
    outputFile: '/demos/demos.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var benchmarkjs = new Funnel('node_modules/benchmark', { files: ['benchmark.js'] });
  var benchHarness = 'bench';
  var bench = new Funnel(
    merge([benchmarkjs, benchHarness]),
    { destDir: '/demos' }
  );

  var demos = merge([
    demoHTML,
    demoConcat,
    bench
  ]);

  var HTMLTokenizer = new Funnel(bower + '/simple-html-tokenizer/lib/');

  var tsTree = new Funnel(packages, {
    include: ["**/*.ts"],
    exclude: ["**/*.d.ts"]
  });

  var jsTree = typescript(tsTree);

  var libTree = new Funnel(jsTree, {
    include: ["*/index.js", "*/lib/**/*.js"]
  });

  var packagesTree = merge([
      libTree,
      HTMLTokenizer
  ]);

  var runtimeTree = new Funnel(packagesTree, {
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

  var testTree = new Funnel(jsTree, {
    include: ["*/tests/**/*.js"]
  });

  // Test Assets

  var testHarness = new Funnel('tests', {
    srcDir: '/',
    files: [ 'index.html' ],
    destDir: '/tests'
  });

  testHarness = merge([
    testHarness,
    new Funnel(bower, {
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
    sourceMapConfig: { enabled: true }
  });

  var concatenatedRuntime = concat(transpiledRuntime, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-runtime.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var concatenatedTests = concat(transpiledTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/tests.js',
    sourceMapConfig: { enabled: true }
  });

  var loader = new Funnel(bower, {
    srcDir: '/loader.js',
    files: [ 'loader.js' ],
    destDir: '/assets'
  });

  var es6Tree = new Funnel(packagesTree, {
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
