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
      sourceRoot: '/'
    }
  });

  var benchmarkjs = find('node_modules/benchmark/{benchmark.js}');
  var benchHarness = __dirname + '/bench';
  var bench = find(
    merge([
      benchmarkjs,
      benchHarness
    ]),
    { destDir: '/demos' }
  );

  var demos = merge([
    find(__dirname + '/demos', {
      include: ['*.html'],
      destDir: 'demos'
    }),
    demoConcat,
    bench
  ]);

  // TODO: WAT, why does { } change the output so much....
  var HTMLTokenizer = find(bower + '/simple-html-tokenizer/lib/', { });

  var tsTree = find(packages, {
    include: ["**/*.ts"],
    exclude: ["**/*.d.ts"]
  });

  var jsTree = typescript(tsTree, tsOptions);

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

  return merge([
    demos,
    concatenatedCompiler,
    concatenatedRuntime,
    loader,
    testHarness,
    concatenatedTests
  ]);
}
