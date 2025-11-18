'use strict';

const MergeTrees = require('broccoli-merge-trees');
const createFile = require('broccoli-file-creator');
const Funnel = require('broccoli-funnel');
const path = require('path');
const Overrides = require('./overrides');
const SupportedBrowsers = require('./browsers');

const paths = {};
const absolutePaths = {};

function add(paths, name, path) {
  Object.defineProperty(paths, name, {
    configurable: false,
    get: function () {
      return path;
    },
  });
}

add(paths, 'prod', 'vendor/ember/ember.js');
add(paths, 'debug', 'vendor/ember/ember.js');
add(paths, 'testing', 'vendor/ember/ember-testing.js');

add(
  absolutePaths,
  'templateCompiler',
  path.join(__dirname, '..', 'dist', 'ember-template-compiler.js')
);

const { addonV1Shim } = require('@embroider/addon-shim');

let useEmberModules;

const shim = addonV1Shim(path.join(__dirname, '..'), {
  autoImportCompat: {
    customizeMeta(meta) {
      if (typeof useEmberModules === 'undefined') {
        throw new Error(
          `bug in ember-source: expected to know whether the use-ember-modules feature is enabled`
        );
      }
      if (useEmberModules) {
        return meta;
      } else {
        return { ...meta, 'renamed-modules': {} };
      }
    },
  },
});

module.exports = {
  ...shim,
  paths,
  absolutePaths,

  init() {
    if (shim.init) {
      shim.init.apply(this, arguments);
    } else {
      this._super.init && this._super.init.apply(this, arguments);
    }

    // resets `this.root` to the correct location by default ember-cli
    // considers `__dirname` here to be the root, but since our main entry
    // point is within a subfolder we need to correct that
    this.root = path.join(__dirname, '..');

    // Updates the vendor tree to point to dist, so we get the correct tree in
    // treeForVendor
    this.treePaths.vendor = 'dist';
  },

  _overrideTree: undefined,

  // Expose supported list of browsers for reference by other packages
  supportedBrowsers: SupportedBrowsers,

  included() {
    let optionalFeatures = this.project.addons.find((a) => a.name === '@ember/optional-features');

    // this has to come before shim.included.apply() tries to use our autoImportCompat closure
    useEmberModules = Boolean(optionalFeatures?.isFeatureEnabled('use-ember-modules'));

    if (shim.included) {
      // this is what actually uses our autoImportCompat closure
      shim.included.apply(this, arguments);
    } else {
      this._super.included.apply(this, arguments);
    }

    let overrides = Overrides.for(this.project);

    if (overrides.hasOverrides) {
      this._overrideTree = overrides.toTree();
    }

    if (overrides.hasBuildTimeWarning) {
      this.ui.writeWarnLine('[DEPRECATION] ' + overrides.buildTimeWarning);
    }
  },

  treeForVendor(tree) {
    if (shim.treeForVendor) {
      tree = shim.treeForVendor.call(this, tree);
    }
    const isProduction = process.env.EMBER_ENV === 'production';

    let templateCompiler = new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.js.map'],
    });

    let emberAMDBundles;

    if (useEmberModules) {
      emberAMDBundles = new MergeTrees([
        createFile('ember/ember.js', ''),
        createFile('ember/ember.js.map', ''),
        createFile('ember/ember-testing.js', ''),
        createFile('ember/ember-testing.js.map', ''),
      ]);
    } else {
      let which = isProduction ? 'prod' : 'debug';

      emberAMDBundles = new Funnel(tree, {
        destDir: 'ember',
        include: [
          `ember.${which}.js`,
          `ember.${which}.js.map`,
          'ember-testing.js',
          'ember-testing.js.map',
        ],
        getDestinationPath(path) {
          return path.replace(`ember.${which}.`, 'ember.');
        },
      });
    }

    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');

    // this is primarily so we get preset-env with the app's targets. All our
    // special stuff was already accounted for in the building of the bundles.
    return emberCliBabel.transpileTree(new MergeTrees([emberAMDBundles, templateCompiler]), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
    });
  },
};
