var Funnel = require('broccoli-funnel');
var concatFiles = require('broccoli-concat');
var mergeTrees = require('broccoli-merge-trees');
var moveFile = require('broccoli-file-mover');
var replace = require('broccoli-string-replace');
var removeFile = require('broccoli-file-remover');
var transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
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

var HTMLTokenizer = new Funnel(bower+'/simple-html-tokenizer/lib/');

var DTSTree = new Funnel('src', {
  include: ['*/index.d.ts'],
  
  getDestinationPath: function(relativePath) {
    return relativePath.replace(/\/index\.d\.ts$/, '.js');
  }
});

var libTree = new Funnel('packages', {
  include: ["*/lib/**/*.js"],
});

var packagesTree = mergeTrees([DTSTree, libTree, HTMLTokenizer]);

var runtimeTree = new Funnel(packagesTree, {
  include: ['dom-helper/**/*', 'htmlbars-runtime/**/*']
});

runtimeTree = mergeTrees([runtimeTree, handlebarsInlinedTrees.runtime]);

var compilerTree = mergeTrees([packagesTree, handlebarsInlinedTrees.compiler]);

var testTree = new Funnel('packages', {
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

testHarness = replace(testHarness, {
  files: [ 'tests/packages-config.js' ],
  pattern: {
    match: /\{\{PACKAGES_CONFIG\}\}/g,
    replacement: JSON.stringify(packages, null, 2)
  }
});

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