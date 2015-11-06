var Funnel = require('broccoli-funnel');
var concatFiles = require('broccoli-sourcemap-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var typescript = require('broccoli-typescript-compiler');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
var handlebarsInlinedTrees = require('./build-support/handlebars-inliner');
var getVersion = require('git-repo-version');

module.exports = function() {
  function transpile(tree, label) {
    return transpileES6(tree, label, { resolveModuleSource: null, sourceMaps: 'inline' });
  }

  var dependableTrees = {};

  var bower = 'bower_components';
  var demoHTML = new Funnel('demos', {
    include: ['*.html'],
    destDir: '/demos'
  });

  var demoTS = new Funnel('demos', {
    include: ['**/*.ts']
  });

  var demoES6 = typescript(demoTS);
  var demoES5 = transpile(demoES6);

  var demoConcat = concatFiles(demoES5, {
    inputFiles: ['**/*.js'],
    outputFile: '/demos/demos.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var benchmarkjs = new Funnel('node_modules/benchmark', { files: ['benchmark.js'] });
  var benchHarness = 'bench';
  var bench = new Funnel(
    mergeTrees([benchmarkjs, benchHarness]),
    { destDir: '/demos' }
  );

  var demos = mergeTrees([ demoHTML, demoConcat, bench ]);

  var HTMLTokenizer = new Funnel(bower+'/simple-html-tokenizer/lib/');

  var DTSTree = new Funnel('packages', {
    include: ['*/index.d.ts'],

    getDestinationPath: function(relativePath) {
      return relativePath.replace(/\/index\.d\.ts$/, '.js');
    }
  });

  var tsTree = new Funnel('packages', {
    include: ["**/*.ts"],
    exclude: ["**/*.d.ts"]
  });

  var jsTree = typescript(tsTree);

  var libTree = new Funnel(jsTree, {
    include: ["*/lib/**/*.js"],
  });

  var packagesTree = mergeTrees([DTSTree, libTree, HTMLTokenizer]);

  var runtimeTree = new Funnel(packagesTree, {
    include: ['htmlbars-runtime/**/*']
  });

  runtimeTree = mergeTrees([runtimeTree, handlebarsInlinedTrees.runtime]);

  var compilerTree = mergeTrees([packagesTree, handlebarsInlinedTrees.compiler]);

  var testTree = new Funnel(jsTree, {
    include: ["*/tests/**/*.js"]
  });

  // Test Assets

  var testHarness = new Funnel('tests', {
    srcDir: '/',
    files: [ 'index.html', 'packages-config.js' ],
    destDir: '/tests'
  });

  testHarness = mergeTrees([testHarness, new Funnel(bower, {
    srcDir: '/qunit/qunit',
    destDir: '/tests'
  })]);

  var cliSauce = new Funnel('./node_modules/ember-cli-sauce', {
    srcDir: '/vendor',
    files: [ 'export-test-results.js' ],
    destDir: '/tests'
  });

  var transpiledCompiler = transpile(compilerTree, 'transpiledLibs');
  var transpiledRuntime = transpile(runtimeTree, 'transpiledRuntime');
  var transpiledTests = transpile(testTree, 'transpiledTests');

  var concatenatedCompiler = concatFiles(transpiledCompiler, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-compiler.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var concatenatedRuntime = concatFiles(transpiledRuntime, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-runtime.amd.js',
    sourceMapConfig: { enabled: true }
  });

  var concatenatedTests = concatFiles(transpiledTests, {
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

  return mergeTrees([es6Tree, demos, concatenatedCompiler, concatenatedRuntime, loader, testHarness, concatenatedTests]);
}
