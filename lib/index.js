'use strict';

const MergeTrees = require('broccoli-merge-trees');
const path = require('path');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');
const injectBabelHelpers = require('./transforms/inject-babel-helpers').injectBabelHelpers;
const debugTree = require('broccoli-debug').buildDebugCallback('ember-source:addon');
const vmBabelPlugins = require('@glimmer/vm-babel-plugins');
const Overrides = require('./overrides');

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
  path.join(__dirname, '..', 'dist', 'vendor', 'ember-template-compiler.js')
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

    // Our ember-cli-based, prepublication build makes it annoying to produce a
    // conventional addon structure with directories like "addon" and "vendor"
    // alongside our addon main. It wants to write to `dist`, but also doesn't
    // want to let us generate our addon main in `dist`.
    //
    // So here we first escape "lib" (which ember-cli would otherwise consider
    // the root of our addon due to our lib/index.js living here), and then set
    // our specific trees to come from subdirs in dist.
    this.root = path.join(__dirname, '..');
    this.treePaths.vendor = 'dist/vendor';
    this.treePaths.addon = 'dist/addon';
    this.treePaths['addon-test-support'] = 'dist/test-support';
  },

  name: 'ember-source',
  paths,
  absolutePaths,
  _jqueryIntegrationEnabled: true,
  _overrideTree: undefined,

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
        typeof optionalFeatures.isFeatureExplicitlySet !== 'function'
      ) {
        message.push(
          '* Unable to detect if jquery-integration is explicitly set to a value, please update `@ember/optional-features` to the latest version'
        );
      }

      if (
        optionalFeaturesMissing ||
        (typeof optionalFeatures.isFeatureExplicitlySet === 'function' &&
          !optionalFeatures.isFeatureExplicitlySet('jquery-integration'))
      ) {
        message.push(
          `* The jquery-integration optional feature should be explicitly set to a value under Octane, run \`ember feature:disable jquery-integration\` to disable it, or \`ember feature:enable jquery-integration\` to explicitly enable it`
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

        const SilentError = require('silent-error');
        throw new SilentError(message.join('\n\t'));
      }
    } else {
      this.ui.writeWarnLine(
        'The Ember Classic edition has been deprecated. Speciying "classic" in your package.json, or not specifying a value at all, will no longer be supported. You must explicitly set the "ember.edition" property to "octane". This warning will become an error in Ember 4.0.0.\n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_editions-classic'
      );

      if (
        optionalFeaturesMissing ||
        optionalFeatures.isFeatureEnabled('application-template-wrapper')
      ) {
        this.ui.writeWarnLine(
          'Setting the `application-template-wrapper` optional feature flag to `true`, or not providing a setting at all, has been deprecated. You must add the `@ember/optional-features` addon and set this feature to `false`. You can also run `npx @ember/octanify` to do this. This warning will become an error in Ember 4.0.0.\n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_optional-feature-application-template-wrapper'
        );
      }

      if (
        optionalFeaturesMissing ||
        !optionalFeatures.isFeatureEnabled('template-only-glimmer-components')
      ) {
        this.ui.writeWarnLine(
          'Setting the `template-only-glimmer-components` optional feature flag to `false`, or not providing a setting at all, has been deprecated. You must add the `@ember/optional-features` addon and set this feature to `true`. You can also run `npx @ember/octanify` to do this. This warning will become an error in Ember 4.0.0.\n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_optional-feature-template-only-glimmer-components'
        );
      }
    }

    this._jqueryIntegrationEnabled =
      optionalFeaturesMissing || optionalFeatures.isFeatureEnabled('jquery-integration');

    if (this._jqueryIntegrationEnabled) {
      this.ui.writeWarnLine(
        'Setting the `jquery-integration` optional feature flag to `true`, or not providing a setting at all, has been deprecated. You must add the `@ember/optional-features` addon and set this feature to `false`. This warning will become an error in Ember 4.0.0.\n\nFor more information, see the deprecation guide: https://deprecations.emberjs.com/v3.x/#toc_optional-feature-jquery-integration'
      );
    }

    this.options = this._addBabelConfig(this.options);
  },

  _addBabelConfig(options) {
    const isProduction = process.env.EMBER_ENV === 'production';
    // We want to enable async/generator helpers if we are developing locally,
    // but not for any other project.
    let isEmberSource = this.project.name() === 'ember-source';
    let babelHelperPlugin = injectBabelHelpers(isEmberSource);

    let result = {
      ...options,
      babel: {
        ...options.babel,
        loose: true,
        plugins: [
          ...(('babel' in options && options.babel.plugins) || []),
          babelHelperPlugin,
          buildDebugMacroPlugin(!isProduction),
          ...vmBabelPlugins({ isDebug: !isProduction }),
          [
            require.resolve('@babel/plugin-transform-block-scoping'),
            { throwIfClosureRequired: true },
          ],
          [require.resolve('@babel/plugin-transform-object-assign')],
        ],
      },
      'ember-cli-babel': {
        ...options['ember-cli-babel'],
        disableDebugTooling: true,
        disableEmberModulesAPIPolyfill: true,
      },
    };

    if (isProduction) {
      result.babel.plugins.push(buildStripClassCallcheckPlugin());
    }

    return result;
  },

  options: {
    autoImport: {
      exclude: [
        // ember-auto-import sees these things are devDependencies and errors
        // because it's generally incorrect to try to import a devDependency in
        // addon code. In our case, we're still relying on the bundling behavior
        // where ember-source is including these manually in its own published
        // package. This whole block of config should be deleted at the same
        // time we remove the bundling code, at which point these will all move
        // from devDeps to dependencies. At that same time, we should probably
        // stop prebundling ember-template-compiler.js because we don't want it
        // to version skew.
        '@glimmer/destroyable',
        '@glimmer/env',
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
    if (this._overrideTree) {
      tree = new MergeTrees([tree, this._overrideTree], { overwrite: true });
    }
    let result = this.preprocessJs(tree, '/', this.name, {
      registry: this.registry,
      treeType: 'addon',
    });
    return debugTree(result, 'treeForAddon');
  },

  treeForAddonTestSupport(tree) {
    let result = this.preprocessJs(tree, '/', this.name, {
      registry: this.registry,
      treeType: 'addonTestSupport',
    });
    return debugTree(result, 'treeForAddonTestSupport');
  },
};
