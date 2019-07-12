'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const resolve = require('resolve');
const concatBundle = require('./concat-bundle');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');

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

  transpileTree(tree) {
    let emberCliBabel = this.addons.find(a => a.name === 'ember-cli-babel');
    let options = emberCliBabel.buildBabelOptions();

    options['ember-cli-babel'] = options['ember-cli-babel'] || {};
    options['ember-cli-babel'].disableDebugTooling = true;
    options['ember-cli-babel'].disableEmberModulesAPIPolyfill = true;

    options.babel = options.babel || {};
    options.babel.plugins = options.babel.plugins || [];
    options.babel.plugins.push(buildDebugMacroPlugin(!isProduction));
    options.babel.plugins.push(buildStripClassCallcheckPlugin());

    return emberCliBabel.transpileTree(tree, options);
  },

  treeForVendor(tree) {
    let Funnel = require('broccoli-funnel');
    let MergeTrees = require('broccoli-merge-trees');

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

    let ember;
    let targets = (this.project && this.project.targets && this.project.targets.browsers) || [];

    if (!isProduction && PRE_BUILT_TARGETS.every(target => targets.includes(target))) {
      ember = new Funnel(tree, {
        destDir: 'ember',
        include: ['ember.js', 'ember.map', 'ember-testing.js', 'ember-testing.map'],
      });
    } else {
      // Bundling
      let packages = this.transpileTree(new Funnel(tree, { srcDir: 'packages' }));
      let dependencies = this.transpileTree(new Funnel(tree, { srcDir: 'dependencies' }));
      let headerFiles = new Funnel(tree, { srcDir: 'header' });

      ember = new Funnel(buildBundles(packages, dependencies, headerFiles), {
        destDir: 'ember',
      });
    }

    return new MergeTrees([ember, jquery]);
  },
};

function buildBundles(packages, dependencies, headerFiles) {
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
      headerFiles: ['license.js', 'loader.js'],
      footer: "require('ember');",
    }),

    concatBundle(emberTestingFiles, {
      outputFile: 'ember-testing.js',
      headerFiles: ['license.js', 'loader.js'],
      footer: `
        var testing = require('ember-testing');
        Ember.Test = testing.Test;
        Ember.Test.Adapter = testing.Adapter;
        Ember.Test.QUnitAdapter = testing.QUnitAdapter;
        Ember.setupForTesting = testing.setupForTesting;
      `,
    }),
  ]);
}
