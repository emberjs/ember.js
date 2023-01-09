'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');
const injectBabelHelpers = require('./transforms/inject-babel-helpers').injectBabelHelpers;
const debugTree = require('broccoli-debug').buildDebugCallback('ember-source:addon');
const vmBabelPlugins = require('@glimmer/vm-babel-plugins');
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

add(
  absolutePaths,
  'templateCompiler',
  path.join(__dirname, '..', 'dist', 'ember-template-compiler.js')
);

module.exports = {
  init() {
    this._super.init && this._super.init.apply(this, arguments);

    // resets `this.root` to the correct location by default ember-cli
    // considers `__dirname` here to be the root, but since our main entry
    // point is within a subfolder we need to correct that
    this.root = path.join(__dirname, '..');

    // Updates the vendor tree to point to dist, so we get the correct tree in
    // treeForVendor
    this.treePaths.vendor = 'dist';

    // TODO: distribute these things in the canonical places (I think
    // "lib/addon" and "lib/test-support", given that we already have our main
    // ember-cli entrypoint under "lib") so we can delete these lines
    this.treePaths.addon = 'dist';
    this.treePaths['addon-test-support'] = 'dist';
  },

  name: 'ember-source',
  paths,
  absolutePaths,
  _overrideTree: undefined,

  // Expose supported list of browsers for reference by other packages
  supportedBrowsers: SupportedBrowsers,

  included() {
    this._super.included.apply(this, arguments);

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

      if (
        optionalFeaturesMissing ||
        optionalFeatures.isFeatureEnabled('application-template-wrapper')
      ) {
        message.push(
          `* The application-template-wrapper optional feature should be disabled under Octane, run \`ember feature:disable application-template-wrapper\` to disable it`
        );
      }

      if (
        optionalFeaturesMissing ||
        !optionalFeatures.isFeatureEnabled('template-only-glimmer-components')
      ) {
        message.push(
          `* The template-only-glimmer-components optional feature should be enabled under Octane, run \`ember feature:enable template-only-glimmer-components\` to enable it`
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

  options: {
    autoImport: {
      // ember-auto-import sees these things are devDependencies and errors
      // because it's generally incorrect to try to import a devDependency in
      // addon code. In our case, we're still relying on the bundling behavior
      // where ember-source is including these manually. This whole block of
      // config should be deleted at the same time we remove the bundling code,
      // at which point these will all move from devDeps to dependencies.
      exclude: [
        '@glimmer/destroyable',
        '@glimmer/global-context',
        '@glimmer/manager',
        '@glimmer/node',
        '@glimmer/opcode-compiler',
        '@glimmer/owner',
        '@glimmer/program',
        '@glimmer/reference',
        '@glimmer/runtime',
        '@glimmer/validator',
        '@simple-dom/document',
        'dag-map',
        'route-recognizer',
        'router_js',
        'rsvp',
      ],
    },
  },

  treeForAddon(tree) {
    const isProduction = process.env.EMBER_ENV === 'production';

    if (this._overrideTree) {
      tree = new MergeTrees([tree, this._overrideTree], { overwrite: true });
    }

    let packages = new MergeTrees([
      this.transpileTree(
        new Funnel(tree, { srcDir: 'packages', exclude: ['ember-testing/**'] }),
        isProduction,
        false
      ),
      this.transpileTree(new Funnel(tree, { srcDir: 'dependencies' }), isProduction, false),
    ]);

    let result = this.preprocessJs(packages, '/', this.name, {
      registry: this.registry,
      treeType: 'addon',
    });

    return debugTree(result, 'treeForAddon');
  },

  treeForAddonTestSupport(tree) {
    const isProduction = process.env.EMBER_ENV === 'production';

    let packages = this.transpileTree(
      new Funnel(tree, { srcDir: 'packages', include: ['ember-testing/**'] }),
      isProduction,
      false
    );

    let result = this.preprocessJs(packages, '/', this.name, {
      registry: this.registry,
      treeType: 'addonTestSupport',
    });

    return debugTree(result, 'treeForAddonTestSupport');
  },

  // TODO: move this config so that it gets done automatically by
  // ember-cli-babel.
  //
  // This method also gets called externally by ../ember-cli-build.js
  transpileTree(tree, isProduction, compileModules = true) {
    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');
    return emberCliBabel.transpileTree(tree, this._buildBabelOptions(isProduction, compileModules));
  },

  _buildBabelOptions(isProduction, compileModules) {
    let parentOptions = this.parent && this.parent.options;
    let appOptions = this.app && this.app.options;
    let babelOptions = (parentOptions || appOptions || {}).babel;

    // We want to enable async/generator helpers if we are developing locally,
    // but not for any other project.
    let isEmberSource = this.project.name() === 'ember-source';
    let babelHelperPlugin = injectBabelHelpers(isEmberSource);

    let options = {
      'ember-cli-babel': {
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
      babel: Object.assign({}, babelOptions, {
        loose: true,
        plugins: [
          babelHelperPlugin,
          buildDebugMacroPlugin(!isProduction),
          ...vmBabelPlugins({ isDebug: !isProduction }),
          [
            require.resolve('@babel/plugin-transform-block-scoping'),
            { throwIfClosureRequired: true },
          ],
        ],
      }),
    };

    if (typeof compileModules === 'boolean') {
      options['ember-cli-babel'].compileModules = compileModules;
    }

    if (isProduction) {
      options.babel.plugins.push(buildStripClassCallcheckPlugin());
    }

    return options;
  },

  treeForVendor(tree) {
    return new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.map'],
    });
  },
};
