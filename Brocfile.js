var Funnel = require('broccoli-funnel');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var typescript = require('broccoli-typescript-compiler');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
var handlebarsInlinedTrees = require('./build-support/handlebars-inliner');
var getVersion = require('git-repo-version');

var dependableTrees = {};

var bower = 'bower_components';
var demos = new Funnel('demos', { destDir: '/demos' });

var benchmarkjs = new Funnel('node_modules/benchmark', { files: ['benchmark.js'] });
var benchHarness = 'bench';
var bench = new Funnel(
  mergeTrees([benchmarkjs, benchHarness]),
  { destDir: '/bench' }
);

var HTMLTokenizer = new Funnel(bower+'/simple-html-tokenizer/lib/');

var DTSTree = new Funnel('src', {
  include: ['*/index.d.ts'],
  
  getDestinationPath: function(relativePath) {
    return relativePath.replace(/\/index\.d\.ts$/, '.js');
  }
});

var tsTree = new Funnel('src', {
  include: ["**/*.ts", "**/*.d.ts"]
});

var jsTree = typescript(tsTree);

jsTree = new Funnel(jsTree, {
  exclude: ["**/*.d.js"]
});

var libTree = new Funnel(jsTree, {
  include: ["*/lib/**/*.js"],
});

var packagesTree = mergeTrees([DTSTree, libTree, HTMLTokenizer]);

var runtimeTree = new Funnel(packagesTree, {
  include: ['dom-helper/**/*', 'htmlbars-runtime/**/*']
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

var transpiledCompiler = transpileES6(compilerTree, 'transpiledLibs');
var transpiledRuntime = transpileES6(runtimeTree, 'transpiledRuntime');
var transpiledTests = transpileES6(testTree, 'transpiledTests');

var concatenatedCompiler = concatFiles(transpiledCompiler, {
  inputFiles: ['**/*.js'],
  outputFile: '/amd/glimmer-compiler.amd.js'
});

var concatenatedRuntime = concatFiles(transpiledRuntime, {
  inputFiles: ['**/*.js'],
  outputFile: '/amd/glimmer-runtime.amd.js'
});

var concatenatedTests = concatFiles(transpiledTests, {
  inputFiles: ['**/*.js'],
  outputFile: '/tests.js'
})

var loader = new Funnel(bower, {
  srcDir: '/loader.js',
  files: [ 'loader.js' ],
  destDir: '/assets'
});

module.exports = mergeTrees([demos, concatenatedCompiler, concatenatedRuntime, loader, testHarness, concatenatedTests]);