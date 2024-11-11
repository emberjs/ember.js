'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const Overrides = require('./overrides');
const SilentError = require('silent-error');
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

const shim = addonV1Shim(path.join(__dirname, '..'), {
  autoImportCompat: {
    customizeMeta(meta) {
      return { ...meta, 'renamed-modules': {} };
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
    if (shim.included) {
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

    const { has } = require('@ember/edition-utils');

    let optionalFeatures = this.project.addons.find((a) => a.name === '@ember/optional-features');
    let optionalFeaturesMissing = optionalFeatures === undefined;

    if (has('octane')) {
      let message = [];

      if (optionalFeaturesMissing) {
        message.push(
          `* the @ember/optional-features addon is missing, run \`ember install @ember/optional-features\` to install it`
        );
      }

      if (message.length > 0) {
        message.unshift(
          `You have configured your application to indicate that it is using the 'octane' edition (via \`setEdition('octane')\`), but the appropriate Octane features were not enabled:\n`
        );

        throw new SilentError(message.join('\n\t'));
      }
    } else {
      throw new SilentError(
        'The Ember Classic edition has been removed. Specifying "classic" in your package.json, or not specifying a value at all, is no longer supported. You must explicitly set the "ember.edition" property to "octane". You can also run `npx @ember/octanify` to do this. \n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_editions-classic'
      );
    }

    if (
      !optionalFeaturesMissing &&
      optionalFeatures.isFeatureEnabled('jquery-integration') &&
      typeof optionalFeatures.isFeatureExplicitlySet === 'function' &&
      optionalFeatures.isFeatureExplicitlySet('jquery-integration')
    ) {
      throw new SilentError(
        'Setting the `jquery-integration` optional feature flag to `true` was deprecated in Ember 3.x and removed in Ember 4.0.0. You must add the `@ember/optional-features` addon and set this feature to `false`.\n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_optional-feature-jquery-integration'
      );
    }
  },

  treeForVendor(tree) {
    if (shim.treeForVendor) {
      tree = shim.treeForVendor.call(this, tree);
    }
    const isProduction = process.env.EMBER_ENV === 'production';

    let templateCompiler = new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.map'],
    });

    let which = isProduction ? 'prod' : 'debug';

    let ember = new Funnel(tree, {
      destDir: 'ember',
      include: [`ember.${which}.js`, `ember.${which}.map`, 'ember-testing.js', 'ember-testing.map'],
      getDestinationPath(path) {
        return path.replace(`ember.${which}.`, 'ember.');
      },
    });

    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');

    // this is primarily so we get preset-env with the app's targets. All our
    // special stuff was already accounted for in the building of the bundles.
    return emberCliBabel.transpileTree(new MergeTrees([ember, templateCompiler]), {
      'ember-cli-babel': {
        compileModules: false,
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
    });
  },
};
