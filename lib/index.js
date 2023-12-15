'use strict';

const MergeTrees = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');
const path = require('path');
const concatBundle = require('./concat-bundle');
const buildDebugMacroPlugin = require('./build-debug-macro-plugin');
const buildStripClassCallcheckPlugin = require('./build-strip-class-callcheck-plugin');
const injectBabelHelpers = require('./transforms/inject-babel-helpers').injectBabelHelpers;
const debugTree = require('broccoli-debug').buildDebugCallback('ember-source:addon');
const { default: vmBabelPlugins } = require('@glimmer/vm-babel-plugins');
const Overrides = require('./overrides');
const SilentError = require('silent-error');
const SupportedBrowsers = require('./browsers');

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

  transpileTree(tree, isProduction, shouldCompileModules) {
    let emberCliBabel = this.addons.find((a) => a.name === 'ember-cli-babel');

    let parentOptions = this.parent && this.parent.options;
    let appOptions = this.app && this.app.options;
    let babelOptions = (parentOptions || appOptions || {}).babel;

    // We want to enable async/generator helpers if we are developing locally,
    // but not for any other project.
    let isEmberSource = this.project.name() === 'ember-source';
    let babelHelperPlugin = injectBabelHelpers(isEmberSource);

    let compilerPath;
    if (isEmberSource) {
      // Here we are using the template compiler by directly evaluating it in
      // node, because we *are* the build that produces
      // ember-template-compiler.js.
      compilerPath = path.resolve(__dirname, '../broccoli/glimmer-template-compiler');
    } else {
      // When we're building an app, we use the already built template compiler.
      compilerPath = path.resolve(__dirname, '../dist/ember-template-compiler.js');
    }

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
          [require.resolve('babel-plugin-ember-template-compilation'), { compilerPath }],
          ...vmBabelPlugins({ isDebug: !isProduction }),
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
        footer: `
        (function bootstrap() {
          // Bootstrap Node module
          if (typeof module === 'object' && typeof module.require === 'function') {
            module.exports = require('ember').default;
          }
        })();
        `,
      }),

      concatBundle(emberTestingFiles, {
        outputFile: 'ember-testing.js',
        footer: "require('ember-testing');",
      }),
    ]);
  },

  treeForVendor(tree) {
    let templateCompiler = new Funnel(tree, {
      destDir: 'ember',
      include: ['ember-template-compiler.js', 'ember-template-compiler.map'],
    });

    let ember;
    let targets = (this.project && this.project.targets && this.project.targets.browsers) || [];
    let targetNode = (this.project && this.project.targets && this.project.targets.node) || false;

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

    return debugTree(new MergeTrees([ember, templateCompiler]), 'vendor:final');
  },
};
