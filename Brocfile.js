/* jshint node: true */

var fs  = require('fs');
var util = require('util');
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
var useStrictRemover = require('broccoli-use-strict-remover');
var derequire = require('broccoli-derequire');

var getVersion = require('git-repo-version');
var yuidocPlugin = require('ember-cli-yuidoc');

// To create fast production builds (without ES3 support, minification, derequire, or JSHint)
// run the following:
//
// DISABLE_ES3=true DISABLE_JSHINT=true DISABLE_MIN=true DISABLE_DEREQUIRE=true ember serve --environment=production

var env = process.env.EMBER_ENV || 'development';
var disableJSHint = !!process.env.DISABLE_JSHINT || false;
var disableES3    = !!process.env.DISABLE_ES3 || false;
var disableMin    = !!process.env.DISABLE_MIN || false;
var enableDocs    = !!process.env.ENABLE_DOCS || false;
var disableDefeatureify;

var disableDerequire = !!process.env.DISABLE_DEREQUIRE || false;

// We must increase the maxTickDepth in order to prevent errors from node
process.maxTickDepth = 2000;

if (process.env.DEFEATUREIFY === 'true') {
  disableDefeatureify = false;
} else {
  disableDefeatureify = env === 'development';
}

var generateTemplateCompiler = require('./lib/broccoli-ember-template-compiler-generator');
var inlineTemplatePrecompiler = require('./lib/broccoli-ember-inline-template-precompiler');

/*
  Defeatureify is used in the ember-dev package to enable or remove features and
  strip debug statements during the Ember.js build process.  Used largely for
  removing features.  An example might look like this:

  ```
    if (Ember.FEATURES.isEnabled('ember-metal-is-present')) {
      ...
    }
  ```

  The `...` and if block would be stripped out of final output unless
  `features.json` has `ember-metal-is-present` set to true.
 */
function defeatureifyConfig(opts) {
  var stripDebug = false;
  var options = opts || {};
  var configJson = JSON.parse(fs.readFileSync("features.json").toString());
  var features = options.features || configJson.features;

  if (configJson.hasOwnProperty('stripDebug')) { stripDebug = configJson.stripDebug; }
  if (options.hasOwnProperty('stripDebug')) { stripDebug = options.stripDebug; }

  for (var flag in features) {
    if (features[flag] === 'development-only') {
      features[flag] = options.environment !== 'production';
    }
  }

  return {
    enabled:           features,
    debugStatements:   options.debugStatements || configJson.debugStatements,
    namespace:         options.namespace || configJson.namespace,
    enableStripDebug:  stripDebug
  };
}

/*
  Returns a tree picked from `packages/#{packageName}/lib` and then move `main.js` to `/#{packageName}.js`.
 */
function vendoredPackage(packageName, _options) {
  var options = _options || {};

  var libPath = options.libPath || 'packages/' + packageName + '/lib';
  var mainFile = options.mainFile || 'main.js';
  /*
    For example:
      Given the following dir:
        /packages/metamorph
          └── lib
            └── main.js
      Then tree would be:
        /metamorph
          └── main.js
   */
  var libTree = pickFiles(libPath, {
    files: [ mainFile ],
    srcDir: '/',
    destDir: '/' + packageName
  });

  /*
    Then we move the main.js to packageName.js
    Given:
      /metamorph
        └── main.js
    Then:
      /metamorph
        └── metamorph.js
   */
  var sourceTree = moveFile(libTree, {
    srcFile: packageName + '/' + mainFile,
    destFile: '/' + packageName + '.js'
  });

  if (env !== 'development' && !disableES3) {
    sourceTree = es3recast(sourceTree);
  }

  return sourceTree;
}

/*
  Responsible for concatenating ES6 modules together wrapped in loader and iife
  (immediately-invoked function expression)
 */
function concatES6(inputTrees, options) {
  // see vendoredPackage
  var loader = vendoredPackages['loader'];
  var inputFiles = options.inputFiles;
  var destFile = options.destFile;
  var sourceTrees;


  // if given an array of trees merge into single tree
  if (util.isArray(inputTrees)) {
    sourceTrees = mergeTrees(inputTrees, {overwrite: true});
  } else {
    sourceTrees = inputTrees;
  }

  sourceTrees = transpileES6(sourceTrees, {
    moduleName: true
  });

  sourceTrees = useStrictRemover(sourceTrees);

  /*
    In order to ensure that tree is compliant with older Javascript versions we
    recast these trees here.  For example, in ie6 the following would be an
    error:

    ```
     {default: "something"}.default
    ```

    However, in ECMA5 this is allowed.  es3recast will convert the above into:

    ```
     {default: "something"}['default']
    ```
   */
  if (options.es3Safe && !disableES3) {
    sourceTrees = es3recast(sourceTrees);
  }

  // see defeatureify
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

  // concats the local `concatTrees` variable see concat options here:
  // https://github.com/rlivsey/broccoli-concat/blob/master/README.md
  var concattedES6 =  concat(mergeTrees(concatTrees), {
    wrapInEval: options.wrapInEval,
    inputFiles: inputFiles,
    outputFile: destFile
  });

  if (options.derequire && !disableDerequire) {
     concattedES6 =  derequire(concattedES6);
  }

  return concattedES6;
}

/*
  Creates tree from tests for use later in distTrees output
 */
var testConfig = pickFiles('tests', {
  srcDir: '/',
  files: ['**/*.*'],
  destDir: '/tests'
});

/*
  This actually replaces {{FEATURES}} with the contents of the features section
  in feature.json (https://github.com/emberjs/ember.js/blob/master/features.json#L2-L16).
  The defeatureifyConfig function moves the features property to enabled
  (https://github.com/emberjs/ember.js/blob/master/Brocfile.js#L35) since
  broccoli-defeatureify requires that format.
*/
testConfig = replace(testConfig, {
  files: [ 'tests/index.html' ],
  patterns: [
    { match: /\{\{DEV_FEATURES\}\}/g,
      replacement: function() {
        var features = defeatureifyConfig().enabled;

        return JSON.stringify(features);
      }
    },
    { match: /\{\{PROD_FEATURES\}\}/g,
      replacement: function() {
        var features = defeatureifyConfig({
          environment: 'production'
        }).enabled;

        return JSON.stringify(features);
      }
    },
  ]
});

var s3TestRunner = pickFiles(testConfig, {
  srcDir: '/tests',
  destDir: '/ember-tests',
  files: ['index.html']
});

s3TestRunner = replace(s3TestRunner, {
  files: ['ember-tests/index.html'],
  patterns: [
    { match: new RegExp('../ember', 'g'), replacement: './ember' },
    { match: new RegExp('../qunit/qunit.css', 'g'), replacement: 'http://code.jquery.com/qunit/qunit-1.15.0.css' },
    { match: new RegExp('../qunit/qunit.js', 'g'), replacement: 'http://code.jquery.com/qunit/qunit-1.15.0.js' },
    { match: new RegExp('../handlebars/handlebars.js', 'g'), replacement: 'http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars-v2.0.0.js' },
    { match: new RegExp('../jquery/jquery.js', 'g'), replacement: 'http://code.jquery.com/jquery-1.11.1.js'}
  ]
});

testConfig = replace(testConfig, {
  files: [ 'tests/index.html' ],
  patterns: [
    { match: /\{\{DEV_FEATURES\}\}/g,
      replacement: function() {
        var features = defeatureifyConfig().enabled;

        return JSON.stringify(features);
      }
    },
    { match: /\{\{PROD_FEATURES\}\}/g,
      replacement: function() {
        var features = defeatureifyConfig({
          environment: 'production'
        }).enabled;

        return JSON.stringify(features);
      }
    },
  ]
});

// List of bower component trees that require no special handling.  These will
// be included in the distTrees for use within testsConfig/index.html
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
  })
];

bowerFiles = mergeTrees(bowerFiles);

var emberDevTestHelpers = pickFiles('bower_components/ember-dev/addon', {
  srcDir: '/',
  destDir: '/ember-dev',
  files: ['**/*.js']
});

// iife - Immediately Invoking Function Expression
// http://en.wikipedia.org/wiki/Immediately-invoked_function_expression
var iifeStart = writeFile('iife-start', '(function() {');
var iifeStop  = writeFile('iife-stop', '})();');

/*
  For use in dependency resolution.  If referenced from within
  `lib/pacakage.js` under the vendorRequirements property will resolve
  dependency graph on behalf of requiring library.

  For example:
    ```
      'ember-metal': {trees: null,  vendorRequirements: ['backburner']}
    ```
 */
var handlebarsConfig = {
  libPath: 'node_modules/handlebars/dist',
  mainFile: 'handlebars.amd.js'
};

var vendoredPackages = {
  'loader':                vendoredPackage('loader'),
  'rsvp':                  vendoredEs6Package('rsvp'),
  'backburner':            vendoredEs6Package('backburner'),
  'router':                vendoredEs6Package('router.js'),
  'route-recognizer':      vendoredEs6Package('route-recognizer'),
  'dag-map':               vendoredEs6Package('dag-map'),
  'morph':                 htmlbarsPackage('morph'),
  'htmlbars-compiler':     htmlbarsPackage('htmlbars-compiler'),
  'simple-html-tokenizer': htmlbarsPackage('simple-html-tokenizer'),
  'htmlbars-test-helpers': htmlbarsPackage('htmlbars-test-helpers', { singleFile: true } ),
  'htmlbars-util':         htmlbarsPackage('htmlbars-util'),
  'handlebars':            vendoredPackage('handlebars', handlebarsConfig)
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

  /*
    Prematurely returns if already defined. Trees is (will be) an object that looks like:

    ```
      {lib: libTree, compiledTree: compiledTrees, vendorTrees: vendorTrees};
    ```
  */
  if (pkg['trees']) {
    return pkg['trees'];
  }

  /*
    Recursively load dependency graph as outlined in `lib/packages.js`

    #TODO: moar detail!!!
  */
  var dependencyTrees = packageDependencyTree(packageName);
  var vendorTrees = pkg.vendorTrees;

  /*
    The list of files to select. This is passed to `pickFiles` below.
  */
  var files = [ '**/*.js'];

  if (pkg.hasTemplates) {
    files.push('**/*.hbs');
  }

  /*
    For packages that are maintained by ember we assume the following structure:

    ```
    packages/ember-extension-support
      ├── lib
      │   ├── container_debug_adapter.js
      │   ├── data_adapter.js
      │   ├── initializers.js
      │   └── main.js
      ├── package.json
      └── tests
          ├── container_debug_adapter_test.js
          └── data_adapter_test.js
    ```

    And the following following will manipulate the above tree into something
    usuable for distribution
  */


  /*
    The following command will give us a libeTree which will look like the following:

    ```
      ember-extension-support
         ├── container_debug_adapter.js
         ├── data_adapter.js
         ├── initializers.js
         └── main.js
    ```

  */
  libTree = pickFiles('packages/' + packageName + '/lib', {
    srcDir: '/',
    files: files,
    destDir: packageName
  });

  /*
   Will rename the main.js file to packageName.js.

    ```
      ember-extension-support
         ├── container_debug_adapter.js
         ├── data_adapter.js
         ├── initializers.js
         └── ember-extension-support.js
    ```
  */
  libTree = moveFile(libTree, {
    srcFile: packageName + '/main.js',
    destFile: packageName + '.js'
  });

  var libJSHintTree = jshintTree(libTree);

  if (pkg.hasTemplates) {
    /*
       Add templateCompiler to libTree.  This is done to ensure that the templates
       are precompiled with the local version of `ember-handlebars-compiler` (NOT
       the `npm` version), and includes any changes.  Specifically, so that you
       can work on the template compiler and still have functional builds.
    */
    libTree = mergeTrees([libTree, templateCompilerTree]);

    /*
      Utilizing the templateCompiler to compile inline handlebars templates to
      handlebar template functions.  This is done so that only Handlebars runtime
      is required instead of all of Handlebars.
    */
    libTree = inlineTemplatePrecompiler(libTree);

    // Remove templateCompiler from libTree as it is no longer needed.
    libTree = removeFile(libTree, {
      srcFile: 'ember-template-compiler.js'
    });
  }

  var testTree = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    files: ['**/*.js'],
    destDir: '/' + packageName + '/tests'
  });

  var testJSHintTree = jshintTree(testTree);

  /*
    Merge jshint into testTree in order to ensure that if you have a jshint
    failure you'll see them fail in your browser tests
  */
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
  });
  var compiledTrees = [compiledLib];

  /*
    Produces tree for packages.  This will eventually be merged into a single
    file for use in browser tests.
  */
  var compiledTest = concatES6(testTrees, {
    includeLoader: false,
    inputFiles: ['**/*.js'],
    destFile: '/packages/' + packageName + '-tests.js'
  });
  if (!pkg.skipTests) { compiledTrees.push(compiledTest); }

  compiledTrees = mergeTrees(compiledTrees);

  // Memoizes trees.  Guard above ensures that if this is set will automatically return.
  pkg['trees'] = {lib: libTree, compiledTree: compiledTrees, vendorTrees: vendorTrees};

  // tests go boom if you try to pick them and they don't exists
  if (!pkg.skipTests) { pkg['trees'].tests = testTrees; }

  // Baboom!!  Return the trees.
  return pkg.trees;
}

/*
  Iterate over dependencyTree as specified within `lib/packages.js`.  Make sure
  all dependencies are met for each package
*/
function packageDependencyTree(packageName) {
  var dependencyTrees = packages[packageName]['dependencyTrees'];

  // Return if we've already processed this package
  if (dependencyTrees) {
    return dependencyTrees;
  } else {
    dependencyTrees = [];
  }

  var requiredDependencies = packages[packageName]['requirements'] || [];
  var vendoredDependencies = packages[packageName]['vendorRequirements'] || [];

  var libTrees = [];
  var vendorTrees = [];

  // Push vendorPackage tree onto vendorTrees array local hash lookup.  See
  // above.
  vendoredDependencies.forEach(function(dependency) {
    vendorTrees.push(vendoredPackages[dependency]);
  });

  /*
    For example (simplified for demonstration):
    ```
      {
        'ember-views':   {requirements: ['ember-runtime']},
        'ember-runtime': {requirements: ['container', 'ember-metal']},
        'container':     {requirements: []},
        'ember-metal':   {requirements: []}
      }
    ```

    When processing `ember-views` will process dependencies (this is recursive).
    This will call itself on `ember-runtime` which will in turn call itself on
    `container` and then `ember-metal` which (because it has no requirements)
    will terminate the recursion.

    Finally each recurse will return the dependency's lib tree.  So we end with
    an array of lib trees for each dependency in the graph
  */
  requiredDependencies.forEach(function(dependency) {
    libTrees.concat(packageDependencyTree(dependency));
    libTrees.push(es6Package(dependency).lib);
  }, this);

  /*
    Merge and return dependencyTrees.  Overwrite _MUST_ occur in order to
    prevent requirements from stepping on one another.
  */
  packages[packageName]['vendorTrees']            = mergeTrees(vendorTrees, {overwrite: true});
  return packages[packageName]['dependencyTrees'] = mergeTrees(libTrees, {overwrite: true});
}

var vendorTrees          = [];
var devSourceTrees       = [];
var prodSourceTrees      = [];
var testingSourceTrees   = [];
var testTrees            = [emberDevTestHelpers];
var testHelpers          = [];
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

    if (currentPackage.developmentOnly) {
      testingSourceTrees.push(packagesTrees.lib);
    } else {
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


function htmlbarsPackage(packageName, _options) {
  var options = _options || {};
  var fileGlobs = [];

  if (!options.singleFile === true) {
    fileGlobs.push(packageName + '/**/*.js');
  }

  if (!options.ignoreMain === true) {
    fileGlobs.push(packageName + '.js');
  }

  var tree = pickFiles('node_modules/htmlbars/dist/es6/', {
    files: fileGlobs,
    srcDir: '/',
    destDir: '/'
  });

  tree = transpileES6(tree, {
    moduleName: true
  });

  if (env !== 'development' && !disableES3) {
    tree = es3recast(tree);
  }
  return tree;
}

/*
  Relies on bower to install other Ember micro libs.  Assumes that /lib is
  available and contains all the necessary ES6 modules necessary for the library
  to be required.  And compiles them.
*/
function vendoredEs6Package(packageName) {
  var tree = pickFiles('bower_components/' + packageName + '/lib', {
    srcDir: '/', destDir: '/'
  });

  var sourceTree = transpileES6(tree, {
    moduleName: true
  });

  if (env !== 'development' && !disableES3) {
    sourceTree = es3recast(sourceTree);
  }

  sourceTree = useStrictRemover(sourceTree);

  return sourceTree;
}

/*
 Takes devSourceTrees and compiles / concats into ember.js (final output).  If
 non-development will ensure that output is ES3 compliant.
*/
var compiledSource = concatES6(devSourceTrees, {
  es3Safe: env !== 'development',
  derequire: env !== 'development',
  includeLoader: true,
  bootstrapModule: 'ember',
  vendorTrees: vendorTrees,
  inputFiles: ['**/*.js'],
  destFile: '/ember.js'
});


/*
  Resolves dependencies for ember-runtime and compiles / concats them to /ember-runtime.js

  Dependency graph looks like this:

  ```
    'ember-runtime': {vendorRequirements: ['rsvp'], requirements: ['container', 'ember-metal']}
  ```
*/
function buildRuntimeTree() {
  es6Package('ember-runtime');
  var runtimeTrees = [packages['ember-runtime'].trees.lib];
  var runtimeVendorTrees = packages['ember-runtime'].vendorRequirements.map(function(req){ return vendoredPackages[req];});
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


  var exportsTree = writeFile('export-ember', ';module.exports = Ember;\n');

  return concat(mergeTrees([compiledRuntime, exportsTree]), {
    wrapInEval: false,
    inputFiles: ['ember-runtime.js', 'export-ember'],
    outputFile: '/ember-runtime.js'
  });
}

// Generates prod build.  defeatureify increases the overall runtime speed of ember.js by
// ~10%.  See defeatureify.
var prodCompiledSource = concatES6(prodSourceTrees, {
  es3Safe: env !== 'development',
  derequire: env !== 'development',
  includeLoader: true,
  bootstrapModule: 'ember',
  vendorTrees: vendorTrees,
  inputFiles: ['**/*.js'],
  destFile: '/ember.prod.js',
  defeatureifyOptions: {
    stripDebug: true,
    environment: 'production'
  }
});

// Generates ember-testing.js to allow testing against production Ember builds.
var testingCompiledSource = concatES6(testingSourceTrees, {
  es3Safe: env !== 'development',
  derequire: env !== 'development',
  includeLoader: true,
  bootstrapModule: 'ember-testing',
  inputFiles: ['**/*.js'],
  destFile: '/ember-testing.js'
});

// Take prod output and minify.  This reduces filesize (as you'd expect)
var minCompiledSource = moveFile(prodCompiledSource, {
  srcFile: 'ember.prod.js',
  destFile: 'ember.min.js'
});
minCompiledSource = uglifyJavaScript(minCompiledSource, {
  mangle: true,
  compress: true
});

// Take testsTrees and compile them for consumption in the browser test suite.
var compiledTests = concatES6(testTrees, {
  es3Safe: env !== 'development',
  derequire: env !== 'development',
  includeLoader: true,
  inputFiles: ['**/*.js'],
  destFile: '/ember-tests.js'
});

// Take testsTrees and compile them for consumption in the browser test suite
// to be used by production builds
var prodCompiledTests = concatES6(testTrees, {
  es3Safe: env !== 'development',
  derequire: env !== 'development',
  includeLoader: true,
  inputFiles: ['**/*.js'],
  destFile: '/ember-tests.prod.js',
  defeatureifyOptions: {
    environment: 'production'
  }
});

var distTrees = [templateCompilerTree, compiledSource, compiledTests, testingCompiledSource, testConfig, bowerFiles];

// If you are not running in dev add Production and Minify build to distTrees.
// This ensures development build speed is not affected by unnecessary
// minification and defeaturification
if (env !== 'development') {
  distTrees.push(s3TestRunner);
  distTrees.push(prodCompiledSource);
  distTrees.push(prodCompiledTests);

  if (!disableMin) {
    distTrees.push(minCompiledSource);
  }
  distTrees.push(buildRuntimeTree());
}

// merge distTrees and sub out version placeholders for distribution
distTrees = mergeTrees(distTrees);

if (enableDocs && ["serve", "s"].indexOf(process.argv[2]) !== -1 ) {
  distTrees = yuidocPlugin.addDocsToTree(distTrees);
}

distTrees = replace(distTrees, {
  files: [ '**/*.js', '**/*.json' ],
  patterns: [
    { match: /VERSION_STRING_PLACEHOLDER/g, replacement: getVersion() }
  ]
});

module.exports = distTrees;
