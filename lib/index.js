'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const resolve = require('resolve');
const concatBundle = require('./concat-bundle');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');
const injectBabelHelpers = require('./transforms/inject-babel-helpers');

const isProduction = process.env.EMBER_ENV === 'production';

const PRE_BUILT_TARGETS = [
  'last 1 Chrome versions',
  'last 1 Firefox versions',
  'last 1 Safari versions',
];

const paths = {};
const absolutePaths = {};

function add(paths, name, path) {
  Object.defineProperty(paths, name, {
    configurable: false,
    get: function() {
      return path;
    },
  });
}

add(paths, 'prod', 'vendor/ember/ember.js');
add(paths, 'debug', 'vendor/ember/ember.js');
add(paths, 'testing', 'vendor/ember/ember-testing.js');
add(paths, 'jquery', 'vendor/ember/jquery/jquery.js');

add(
  absolutePaths,
  'templateCompiler',
  path.join(__dirname, '..', 'dist', 'ember-template-compiler.js')
);

module.exports = {
  init() {
    this._super.init && this._super.init.apply(this, arguments);

    if ('ember' in this.project.bowerDependencies()) {
      // TODO: move this to a throw soon.
      this.ui.writeWarnLine(
        'Ember.js is now provided by node_module `ember-source`, please remove it from bower'
      );
    }

    // resets `this.root` to the correct location by default ember-cli
    // considers `__dirname` here to be the root, but since our main entry
    // point is within a subfolder we need to correct that
    this.root = path.join(__dirname, '..');

    // Updates the vendor tree to point to dist, so we get the correct tree in
    // treeForVendor
    this.treePaths.vendor = 'dist';
  },

  name: 'ember-source',
  paths,
  absolutePaths,

  transpileTree(tree, isProduction) {
    let emberCliBabel = this.addons.find(a => a.name === 'ember-cli-babel');

    let parentOptions = this.parent && this.parent.options;
    let appOptions = this.app && this.app.options;
    let babelOptions = (parentOptions || appOptions || {}).babel;

    let options = {
      'ember-cli-babel': {
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
      babel: Object.assign({}, babelOptions, {
        loose: true,
        plugins: [
          injectBabelHelpers,
          buildDebugMacroPlugin(!isProduction),
          [
            require.resolve('@babel/plugin-transform-block-scoping'),
            { throwIfClosureRequired: true },
          ],
          [require.resolve('@babel/plugin-transform-object-assign')],
        ],
      }),
    };

    if (isProduction) {
      options.babel.plugins.push(buildStripClassCallcheckPlugin());
    }

    return emberCliBabel.transpileTree(tree, options);
  },

  buildEmberBundles(tree, isProduction) {
    let packages = this.transpileTree(new Funnel(tree, { srcDir: 'packages' }), isProduction);

    let dependencies = this.transpileTree(
      new Funnel(tree, { srcDir: 'dependencies' }),
      isProduction
    );

    let headerFiles = new Funnel(tree, { srcDir: 'header' });

    let exclude = isProduction ? ['ember-testing/**'] : [];

    let emberFiles = new MergeTrees([new Funnel(packages, { exclude }), dependencies, headerFiles]);

    let emberTestingFiles = new MergeTrees([
      new Funnel(packages, {
        include: [
          '@ember/debug/lib/**',
          '@ember/debug/index.js',
          'ember-testing/index.js',
          'ember-testing/lib/**',
        ],
      }),
      headerFiles,
    ]);

    return new MergeTrees([
      concatBundle(emberFiles, {
        outputFile: 'ember.js',
        footer: "require('ember');",
      }),

      concatBundle(emberTestingFiles, {
        outputFile: 'ember-testing.js',
        footer: `
          var testing = require('ember-testing');
          Ember.Test = testing.Test;
          Ember.Test.Adapter = testing.Adapter;
          Ember.Test.QUnitAdapter = testing.QUnitAdapter;
          Ember.setupForTesting = testing.setupForTesting;
        `,
      }),
    ]);
  },

  treeForVendor(tree) {
    let jqueryPath;

    try {
      jqueryPath = path.dirname(
        resolve.sync('jquery/package.json', { basedir: this.project.root })
      );
    } catch (error) {
      jqueryPath = path.dirname(require.resolve('jquery/package.json'));
    }

    let jquery = new Funnel(jqueryPath + '/dist', {
      destDir: 'ember/jquery',
      files: ['jquery.js'],
    });

    let templateCompiler = new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.map'],
    });

    let ember;
    let targets = (this.project && this.project.targets && this.project.targets.browsers) || [];

    if (!isProduction && PRE_BUILT_TARGETS.every(target => targets.includes(target))) {
      ember = new Funnel(tree, {
        destDir: 'ember',
        include: ['ember.debug.js', 'ember.debug.map', 'ember-testing.js', 'ember-testing.map'],
        getDestinationPath(path) {
          return path.replace('ember.debug.', 'ember.');
        },
      });
    } else {
      ember = new Funnel(this.buildEmberBundles(tree, isProduction), {
        destDir: 'ember',
      });
    }

    return new MergeTrees([ember, templateCompiler, jquery]);
  },
};
