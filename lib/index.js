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
const semver = require('semver');

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

function* walkAddonTree(project, pathToAddon = []) {
  for (let addon of project.addons) {
    yield [addon, pathToAddon];
    yield* walkAddonTree(addon, [...pathToAddon, `${addon.name}@${addon.pkg.version}`]);
  }
}

function requirementFor(pkg, deps = {}) {
  return deps[pkg];
}

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
  _bootstrapEmber: "require('@ember/-internals/bootstrap').default();",
  _jqueryIntegrationEnabled: true,

  included() {
    this._super.included.apply(this, arguments);

    this._issueGlobalsDeprecation();

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
        footer: this._bootstrapEmber,
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
      PRE_BUILT_TARGETS.every((target) => targets.includes(target)) &&
      targets.length === PRE_BUILT_TARGETS.length &&
      // if node is defined in targets we can't reliably use the prebuilt bundles
      !targetNode
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

  _issueGlobalsDeprecation() {
    if (process.env.EMBER_ENV === 'production') {
      return;
    }

    let isYarnProject = ((root) => {
      try {
        // eslint-disable-next-line node/no-unpublished-require
        return require('ember-cli/lib/utilities/is-yarn-project')(root);
      } catch {
        return undefined;
      }
    })(this.project.root);

    let groupedByTopLevelAddon = Object.create(null);
    let groupedByVersion = Object.create(null);
    let projectInfo;

    for (let [addon, pathToAddon] of walkAddonTree(this.project)) {
      let version = addon.pkg.version;

      if (addon.name === 'ember-cli-babel' && semver.lt(version, '7.26.6')) {
        let info;

        if (addon.parent === this.project) {
          let requirement = requirementFor('ember-cli-babel', this.project.pkg.devDependencies);
          let compatible = semver.satisfies('7.26.6', requirement);

          info = projectInfo = {
            parent: `${this.project.name()} (your app)`,
            version,
            requirement,
            compatible,
            dormant: false,
            path: pathToAddon,
          };
        } else {
          let requirement = requirementFor('ember-cli-babel', addon.parent.pkg.dependencies);
          let compatible = semver.satisfies('7.26.6', requirement);
          let dormant = addon.parent._fileSystemInfo
            ? addon.parent._fileSystemInfo().hasJSFiles === false
            : false;

          let topLevelAddon = addon.parent;

          while (topLevelAddon.parent !== this.project) {
            topLevelAddon = topLevelAddon.parent;
          }

          info = {
            parent: `${addon.parent.name}@${addon.pkg.version}`,
            version,
            requirement,
            compatible,
            dormant,
            path: pathToAddon,
          };

          let addons = groupedByTopLevelAddon[topLevelAddon.name] || [];
          groupedByTopLevelAddon[topLevelAddon.name] = [...addons, info];
        }

        let group = groupedByVersion[version] || Object.create(null);
        groupedByVersion[version] = group;

        let addons = group[info.parent] || [];
        group[info.parent] = [...addons, info];
      }
    }

    if (Object.keys(groupedByVersion).length === 0) {
      return;
    }

    let dormantTopLevelAddons = [];
    let compatibleTopLevelAddons = [];
    let incompatibleTopLevelAddons = [];

    for (let addon of Object.keys(groupedByTopLevelAddon)) {
      let group = groupedByTopLevelAddon[addon];

      if (group.every((info) => info.dormant)) {
        dormantTopLevelAddons.push(addon);
      } else if (group.every((info) => info.compatible)) {
        compatibleTopLevelAddons.push(addon);
      } else {
        incompatibleTopLevelAddons.push(addon);
      }
    }

    let suggestions = 'The following steps may help:\n\n';

    let hasActionableSuggestions = false;

    if (projectInfo) {
      suggestions += '* Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`.\n';
      hasActionableSuggestions = true;
    } else if (compatibleTopLevelAddons.length > 0) {
      // Only show the compatible addons if the project itself is up-to-date, because updating the
      // project's own dependency on ember-cli-babel to latest may also get these addons to use it
      // as well. Otherwise, there is an unnecessary copy in the tree and it needs to be deduped.
      if (isYarnProject === true) {
        suggestions +=
          '* Run `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.\n';
      } else if (isYarnProject === false) {
        suggestions += '* Run `npm dedupe`.\n';
      } else {
        suggestions +=
          '* If using yarn, run `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.\n' +
          '* If using npm, run `npm dedupe`.\n';
      }

      hasActionableSuggestions = true;
    }

    if (incompatibleTopLevelAddons.length > 0) {
      suggestions += '* Upgrade the following addons to the latest version:\n';

      for (let addon of incompatibleTopLevelAddons) {
        suggestions += `  * ${addon}\n`;
      }

      hasActionableSuggestions = true;
    }

    if (!hasActionableSuggestions) {
      // Only show the dormant addons if there are nothing else to do because they are unlikely to
      // be the problem.
      suggestions += '* Upgrade the following addons to the latest version, if available:\n';

      for (let addon of dormantTopLevelAddons) {
        suggestions += `  * ${addon}\n`;
      }
    }

    let details =
      '\n### Details ###\n\n' +
      'Prior to v7.26.6, ember-cli-babel sometimes transpiled imports into the equivalent Ember Global API, ' +
      'potentially triggering this deprecation message indirectly, ' +
      'even when you did not observe these deprecated usages in your code.\n\n' +
      'The following outdated versions are found in your project:\n';

    let hasDormantAddons = false;
    let hasCompatibleAddons = false;

    for (let version of Object.keys(groupedByVersion).sort(semver.compare)) {
      details += `\n* ember-cli-babel@${version}, currently used by:\n`;

      for (let parent of Object.keys(groupedByVersion[version]).sort()) {
        let info = groupedByVersion[version][parent][0];

        details += `  * ${parent}`;

        if (info.dormant) {
          details += ' (Dormant)\n';
          hasDormantAddons = true;
        } else if (info.compatible) {
          details += ' (Compatible)\n';
          hasCompatibleAddons = true;
        } else {
          details += '\n';
        }

        details += `    * Depends on ember-cli-babel@${groupedByVersion[version][parent][0].requirement}\n`;

        for (let info of groupedByVersion[version][parent]) {
          let adddedBy = info.path.slice(0, -1);

          if (adddedBy.length) {
            details += `    * Added by ${adddedBy.join(' > ')}\n`;
          }

          if (info.compatible) {
            hasCompatibleAddons = true;
          }
        }
      }
    }

    if (hasDormantAddons) {
      details +=
        '\nNote: Addons marked as "Dormant" does not appear to have any JavaScript files. ' +
        'Therefore, even if they are using an old version ember-cli-babel, they are ' +
        'unlikely to be the cuplrit of this deprecation and can likely be ignored.\n';
    }

    if (hasCompatibleAddons) {
      details += `\nNote: Addons marked as "Compatible" are already compatible with ember-cli-babel@7.26.6. `;

      if (projectInfo) {
        details += 'Try upgrading your `devDependencies` on `ember-cli-babel` to `^7.26.6`.\n';
      } else {
        if (isYarnProject === true) {
          details +=
            'Try running `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.\n';
        } else if (isYarnProject === false) {
          details += 'Try running `npm dedupe`.\n';
        } else {
          details +=
            'If using yarn, try running `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.' +
            'If using npm, try running `npm dedupe`.\n';
        }
      }
    }

    let globalMessage =
      'Usage of the Ember Global is deprecated. ' +
      'You should import the Ember module or the specific API instead.\n\n' +
      'See https://deprecations.emberjs.com/v3.x/#toc_ember-global for details.\n\n' +
      'Usages of the Ember Global may be caused by an outdated ember-cli-babel dependency. ' +
      suggestions;

    if (hasActionableSuggestions && process.env.EMBER_GLOBAL_DEPRECATIONS !== 'all') {
      globalMessage +=
        '\n### Important ###\n\n' +
        'In order to avoid repeatedly showing the same deprecation messages, ' +
        'no further deprecation messages will be shown for usages of the Ember Global ' +
        'until ember-cli-babel is upgraded to v7.26.6 or above.\n\n' +
        'To see all instances of this deprecation message, ' +
        'set the `EMBER_GLOBAL_DEPRECATIONS` environment variable to "all", ' +
        'e.g. `EMBER_GLOBAL_DEPRECATIONS=all ember test`.\n';
    }

    globalMessage += details;

    if (hasActionableSuggestions) {
      this.ui.writeWarnLine('[DEPRECATION] ' + globalMessage);
    }

    let onDotAccess = `function (dotKey, importKey, module) {
          var message =
            'Using \`' + dotKey + '\` has been deprecated. Instead, import the value directly from ' + module + ':\\n\\n' +
            '  import { ' + importKey + ' } from \\'' + module + '\\';\\n\\n' +
            'These usages may be caused by an outdated ember-cli-babel dependency. ' +
            ${JSON.stringify(suggestions)};

          if (${
            hasActionableSuggestions &&
            process.env.EMBER_RUNLOOP_AND_COMPUTED_DOT_ACCESS_DEPRECATIONS !== 'all'
          }) {
            message +=
              '\\n### Important ###\\n\\n' +
              'In order to avoid repeatedly showing the same deprecation messages, ' +
              'no further deprecation messages will be shown for theses deprecated usages ' +
              'until ember-cli-babel is upgraded to v7.26.6 or above.\\n\\n' +
              'To see all instances of this deprecation message, ' +
              'set the \`EMBER_RUNLOOP_AND_COMPUTED_DOT_ACCESS_DEPRECATIONS\` environment variable to "all", ' +
              'e.g. \`EMBER_RUNLOOP_AND_COMPUTED_DOT_ACCESS_DEPRECATIONS=all ember test\`.\\n';
          }

          message += ${JSON.stringify(details)};

          return message;
        }`;

    this._bootstrapEmber = `
      require('@ember/-internals/bootstrap').default(
        ${JSON.stringify(globalMessage)},
        ${hasActionableSuggestions && process.env.EMBER_GLOBAL_DEPRECATIONS !== 'all'}
      );

      (function(disabled, once, _onDotAccess) {
        var onDotAccess = function () {
          if (disabled) {
            return null;
          } else {
            disabled = once;
            return _onDotAccess.apply(undefined, arguments);
          }
        };

        require('@ember/object')._onDotAccess(onDotAccess);

        require('@ember/runloop')._onDotAccess(onDotAccess);
      })(
        false,
        ${
          hasActionableSuggestions &&
          process.env.EMBER_RUNLOOP_AND_COMPUTED_DOT_ACCESS_DEPRECATIONS !== 'all'
        },
        ${onDotAccess}
      );
    `;
  },
};
