const path = require('path');
const merge = require('broccoli-merge-trees');
const funnel = require('broccoli-funnel');
const concat = require('broccoli-concat');
const typescript = require('broccoli-typescript-compiler');
const transpileES6 = require('emberjs-build/lib/utils/transpile-es6');
const handlebarsInlinedTrees = require('./handlebars-inliner');
const TSLint = require('broccoli-tslinter');

/**
 * For development, this returns a Broccoli tree with:
 *
 * 1. Glimmer packages with each file compiled into its own AMD module.
 * 2. Test files as AMD modules.
 * 3. A test harness, including HTML page, QUnit, dependencies, etc.
 */
module.exports = function(packages) {
  // Compile Glimmer's library and test TypeScript code into
  // ES5 AMD modules.
  let amdTree = transpileGlimmerSourceToAMD();

  let testTree = merge([
    includeGlimmerAMD(amdTree),
    includeTestFiles(amdTree),
    includeVendorDependencies(),
    includeTestHarness()
  ]);

  return funnel(testTree, {
    destDir: 'tests'
  });
}

function transpileGlimmerSourceToAMD() {
  // Find all of the TypeScript source code in `packages/`. Skip the node
  // package because we're building browser tests.
  let tsTree = funnel('packages', {
    include: ['**/*.ts'],
    exclude: [
      '**/*.d.ts',
      '@glimmer/node/**/*'
    ]
  });

  let tslintTree = generateTSLintTests(tsTree);

  // Compile the TypeScript source, including library, test and tslint test files, to
  // ES2015 (including preserving ES2015 modules).
  let jsTree = typescript(merge([tsTree, tslintTree]), {
    tsconfig: {
      compilerOptions: {
        target: 'es5',
        module: 'es6',
        inlineSourceMap: true,
        inlineSources: true,
        moduleResolution: 'node',

        /* Needed to get TypeScript to emit correct sourcemaps */
        rootDir: '.',
        mapRoot: '/'
      }
    }
  });

  // Use Babel to convert to AMD modules and transpile to ES5. Because this is
  // coming from emberjs-build, it rewrites AMD's `define` to `enifed` by
  // default, which we disable.
  return transpileES6(jsTree, 'AMD Tree', {
    avoidDefine: false,
    externalHelpers: false,
    stripRuntimeChecks: false,
    sourceMaps: 'inline',
    // The list of helpers whitelisted from emberjs-build does not support
    // extends. We need to override the entire list to add it.
    helperWhiteList: [
      'tagged-template-literal-loose',
      'slice',
      'defaults',
      'create-class',
      'class-call-check',
      'interop-export-wildcard',
      'inherits',
      'extends'
    ]
  });
}

function generateTSLintTests(tsTree) {
  const tslintConfig = __dirname + '/../../tslint.json';
  return new TSLint(tsTree, {
    configuration: tslintConfig
  });
}

function includeGlimmerAMD(amd) {
  let libAMD = funnel(amd, {
    include: [
      '@glimmer/*/lib/**/*.js',
      '@glimmer/*/index.js'
    ]
  });

  return concat(libAMD, {
    outputFile: 'assets/glimmer.js'
  });
}

function includeTestFiles(amd) {
  let testAMD = funnel(amd, {
    include: [
      '@glimmer/*/test/**/*.js'
    ]
  });

  return concat(testAMD, {
    outputFile: 'assets/tests.js'
  });
}

function includeVendorDependencies() {
  let simpleHTMLTokenizer = funnel('node_modules/simple-html-tokenizer/dist/es6', {
    include: ['*.js'],
    destDir: 'simple-html-tokenizer'
  });

  let handlebars = handlebarsInlinedTrees.compiler;

  let transpiled = transpileES6(merge([simpleHTMLTokenizer, handlebarsInlinedTrees.compiler]), 'test-dependencies', {
    avoidDefine: false
  });

  return concat(transpiled, {
    outputFile: 'assets/vendor.js'
  })
}

function includeTestHarness() {
  let html = funnel('test', {
    include: ['index.html']
  });

  let loaderPath = path.parse(require.resolve('loader.js'));
  let loader = funnel(loaderPath.dir, {
    files: [ loaderPath.base ],
    destDir: '/assets'
  });

  let qunit = funnel(path.join(require.resolve('qunitjs'), '..'), {
    destDir: 'assets/'
  });

  let harnessTrees = [
    html,
    loader,
    qunit
  ];

  return merge(harnessTrees);
}