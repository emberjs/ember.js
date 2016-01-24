/* globals __dirname */

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
  return transpileES6(tree, label, { sourceMaps: 'inline' });
}

module.exports = function() {
  var packages = __dirname + '/packages/node_modules';
  var bower = __dirname + '/bower_components';

  var tsOptions = {
    tsconfig: {
      compilerOptions: {
        target: "es2015",
        inlineSourceMap: true,
        inlineSources: true,
        moduleResolution: "node",

        /* needed to get typescript to emit the desired sourcemaps */
        rootDir: '.',
        mapRoot: '/'
      }
    }
  };

  var demoTS = merge([
    find(__dirname + '/demos', { include: ['**/*.ts']}),
    find(packages + '/glimmer-test-helpers', {
      include: ['**/*.ts'],
      exclude: ['tests/**'],
      destDir: 'glimmer-demos'
    })
  ]);

  var demoES6 = typescript(demoTS, tsOptions);
  var demoES5 = transpile(demoES6);

  var demoConcat = concat(demoES5, {
    inputFiles: ['**/*.js'],
    outputFile: '/demos/demos.amd.js',
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });

  var demos = merge([
    demoConcat,
    find(__dirname + '/demos', {
      include: ['*.html'],
      destDir: 'demos'
    }),
    find(__dirname + '/bench', {
      include: ['*.html'],
      destDir: 'demos'
    }),
    find(__dirname + '/node_modules/benchmark', {
      include: ['benchmark.js'],
      destDir: 'demos'
    })
  ]);


  var tokenizerPath = path.join(require.resolve('simple-html-tokenizer'), '..', 'lib');
  // TODO: WAT, why does { } change the output so much....
  var HTMLTokenizer = find(tokenizerPath, { });

  var tsTree = find(packages, {
    include: ['**/*.ts'],
    exclude: ['**/*.d.ts']
  });

  var jsTree = typescript(tsTree, tsOptions);

  var libTree = find(jsTree, {
    include: ['*/index.js', '*/lib/**/*.js']
  });

  var glimmerCommon = find(libTree, {
    include: [
      'glimmer/**/*.js',
      'glimmer-object/**/*.js',
      'glimmer-reference/**/*.js',
      'glimmer-util/**/*.js',
      'glimmer-wire-format/**/*.js'
    ]
  });

  var glimmerRuntime = find(libTree, {
    include: ['glimmer-runtime/**/*']
  });

  var glimmerCompiler = merge([
    find(libTree, {
      include: [
        'glimmer-syntax/**/*.js',
        'glimmer-compiler/**/*.js'
      ]
    }),
    HTMLTokenizer,
    handlebarsInlinedTrees.compiler
  ]);

  var glimmerTests = merge([
    find(jsTree, { include: ['*/tests/**/*.js'] }),
    find(jsTree, { include: ['glimmer-test-helpers/**/*.js'] })
  ]);

  // Test Assets

  var testHarness = find(__dirname + '/tests', {
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

  glimmerCommon = transpile(glimmerCommon, 'glimmer-common');
  glimmerCompiler = transpile(glimmerCompiler, 'glimmer-compiler');
  glimmerRuntime = transpile(glimmerRuntime, 'glimmer-runtime');
  glimmerTests = transpile(glimmerTests, 'glimmer-tests');

  glimmerCommon = concat(glimmerCommon, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-common.amd.js',
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });

  glimmerCompiler = concat(glimmerCompiler, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-compiler.amd.js',
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });

  glimmerRuntime = concat(glimmerRuntime, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-runtime.amd.js',
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });

  glimmerTests = concat(glimmerTests, {
    inputFiles: ['**/*.js'],
    outputFile: '/amd/glimmer-tests.amd.js',
    sourceMapConfig: {
      enabled: true,
      cache: null,
      sourceRoot: '/'
    }
  });

  var loader = find(bower, {
    srcDir: '/loader.js',
    files: [ 'loader.js' ],
    destDir: '/assets'
  });

  return merge([
    loader,
    testHarness,
    demos,
    glimmerCommon,
    glimmerCompiler,
    glimmerRuntime,
    glimmerTests
  ]);
}
