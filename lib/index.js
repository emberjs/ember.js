'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const resolve = require('resolve');
const concatBundle = require('./concat-bundle');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');
const injectBabelHelpers = require('./transforms/inject-babel-helpers').injectBabelHelpers;
const debugTree = require('broccoli-debug').buildDebugCallback('ember-source:addon');
const vmBabelPlugins = require('@glimmer/vm-babel-plugins');
const Overrides = require('./overrides');

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
    get: function () {
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
  },

  transpileTree(tree, isProduction, shouldCompileModules) {
    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');

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
          [require.resolve('@babel/plugin-transform-object-assign')],
        ],
      }),
    };

    if (shouldCompileModules !== undefined) {
      // ember-cli-babel internally uses **any** value that was provided IIF
      // the option is set so this option must only be set when we have a
      // useful value for it
      options['ember-cli-babel'].compileModules = shouldCompileModules;
    }

    if (isProduction) {
      options.babel.plugins.push(buildStripClassCallcheckPlugin());
    }

    return emberCliBabel.transpileTree(tree, options);
  },

  buildEmberBundles(tree, isProduction) {
    if (this._overrideTree) {
      tree = new MergeTrees([tree, this._overrideTree], { overwrite: true });
    }

    let packages = this.transpileTree(new Funnel(tree, { srcDir: 'packages' }), isProduction);

    let dependencies = this.transpileTree(
      new Funnel(tree, { srcDir: 'dependencies' }),
      isProduction
    );

    let headerFiles = this.transpileTree(
      new Funnel(tree, { srcDir: 'header' }),
      isProduction,
      false
    );

    let exclude = [
      isProduction ? 'ember-testing/**' : null,
      !this._jqueryIntegrationEnabled ? 'jquery' : null,
    ].filter((value) => value !== null);

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
        footer: `require('@ember/-internals/bootstrap')`,
      }),

      concatBundle(emberTestingFiles, {
        outputFile: 'ember-testing.js',
        footer: "require('ember-testing');",
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
    let targetNode = (this.project && this.project.targets && this.project.targets.node) || false;

    if (targets.includes('ie 11')) {
      this.ui.writeWarnLine(
        'Internet Explorer 11 is listed in your compilation targets, but it will no longer be supported in the next major version of Ember. Please update your targets to remove IE 11 and include new targets that are within the updated support policy. For details on the new browser support policy, see:\n\n - The official documentation: http://emberjs.com/browser-support\n - the deprecation guide: https://deprecations.emberjs.com/v3.x#toc_3-0-browser-support-policy\n'
      );
    }

    const isProduction = process.env.EMBER_ENV === 'production';

    if (
      !isProduction &&
      // do the running applications targets match our prebuilt assets targets?
      PRE_BUILT_TARGETS.every((target) => targets.includes(target)) &&
      targets.length === PRE_BUILT_TARGETS.length &&
      // if node is defined in targets we can't reliably use the prebuilt bundles
      !targetNode &&
      // if we have a custom override (e.g. for globals deprecations) we can't use the prebuilt bundles
      !this._overrideTree
    ) {
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

    return debugTree(new MergeTrees([ember, templateCompiler, jquery]), 'vendor:final');
  },
};
