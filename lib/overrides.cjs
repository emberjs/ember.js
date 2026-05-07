const createFile = require('broccoli-file-creator');
const semver = require('semver');
const validSemverRange = require('semver/ranges/valid');

const DEFAULT_OPTIONS = Object.freeze({
  showAllEmberGlobalDeprecations: false,
});

function* walkAddonTree(project, pathToAddon = []) {
  for (let addon of project.addons) {
    yield [addon, pathToAddon];
    yield* walkAddonTree(addon, [...pathToAddon, `${addon.name}@${addon.pkg.version}`]);
  }
}

function requirementFor(pkg, deps = {}) {
  return deps[pkg];
}

const KNOWN_DORMANT_ADDONS = Object.freeze([
  'ember-angle-bracket-invocation-polyfill',
  'ember-fn-helper-polyfill',
  'ember-in-element-polyfill',
  'ember-named-blocks-polyfill',
  'ember-on-modifier',
]);
module.exports = class Overrides {
  static for(project, env = process.env) {
    if (env.EMBER_ENV === 'production') {
      return new Overrides([]);
    } else {
      return new Overrides(Overrides.addonsInfoFor(project), {
        showAllEmberGlobalDeprecations: env.EMBER_GLOBAL_DEPRECATIONS === 'all',
      });
    }
  }

  static *addonsInfoFor(project) {
    for (let [addon, pathToAddon] of walkAddonTree(project)) {
      let version = addon.pkg.version;

      if (addon.name === 'ember-cli-babel' && semver.lt(version, '7.26.6')) {
        if (addon.parent === project) {
          let requirement =
            requirementFor('ember-cli-babel', project.pkg.dependencies) ||
            requirementFor('ember-cli-babel', project.pkg.devDependencies);

          let validRange = validSemverRange(requirement);
          let compatible = validRange ? semver.satisfies('7.26.6', requirement) : true;

          yield {
            parent: `${project.name()} (your app)`,
            topLevel: null,
            version,
            requirement,
            compatible,
            dormant: false,
            path: [],
          };
        } else {
          let requirement = requirementFor('ember-cli-babel', addon.parent.pkg.dependencies);
          let validRange = validSemverRange(requirement);
          let compatible = validRange ? semver.satisfies('7.26.6', requirement) : true;
          let dormant =
            KNOWN_DORMANT_ADDONS.includes(addon.parent.name) ||
            (addon.parent._fileSystemInfo
              ? addon.parent._fileSystemInfo().hasJSFiles === false
              : false);

          let topLevelAddon = addon.parent;

          while (topLevelAddon.parent !== project) {
            topLevelAddon = topLevelAddon.parent;
          }

          yield {
            parent: `${addon.parent.name}@${addon.parent.pkg.version}`,
            topLevel: topLevelAddon.name,
            version,
            requirement,
            compatible,
            dormant,
            path: pathToAddon,
          };
        }
      }
    }
  }

  static printList(list, indent = '') {
    let output = '';

    for (let item of list) {
      if (Array.isArray(item)) {
        output += `${indent}* ${item[0]}\n`;
        output += Overrides.printList(item[1], indent + '  ');
      } else {
        output += `${indent}* ${item}\n`;
      }
    }

    return output;
  }

  constructor(addonsInfo, options = {}) {
    let _addonsInfo = [];
    let projectInfo;
    let groupedByTopLevel = Object.create(null);
    let groupedByVersion = Object.create(null);

    for (let info of addonsInfo) {
      _addonsInfo.push(info);

      if (info.topLevel === null) {
        projectInfo = info;
      } else {
        let topLevel = info.topLevel;
        let addons = groupedByTopLevel[topLevel] || [];
        groupedByTopLevel[topLevel] = [...addons, info];
      }

      let version = info.version;

      let group = groupedByVersion[version] || Object.create(null);
      groupedByVersion[version] = group;

      let addons = group[info.parent] || [];
      group[info.parent] = [...addons, info];
    }

    let dormantTopLevelAddons = [];
    let compatibleTopLevelAddons = [];
    let incompatibleTopLevelAddons = [];

    let suggestions = [];
    let hasActionableSuggestions = false;

    if (_addonsInfo.length > 0) {
      for (let addon of Object.keys(groupedByTopLevel)) {
        let group = groupedByTopLevel[addon];

        if (group.every((info) => info.dormant)) {
          dormantTopLevelAddons.push(addon);
        } else if (group.every((info) => info.compatible)) {
          compatibleTopLevelAddons.push(addon);
        } else {
          incompatibleTopLevelAddons.push(addon);
        }
      }

      if (projectInfo) {
        suggestions.push('Upgrade your `devDependencies` on `ember-cli-babel` to `^7.26.6`.');
        hasActionableSuggestions = true;
      } else if (compatibleTopLevelAddons.length > 0) {
        // Only show the compatible addons if the project itself is up-to-date, because updating the
        // project's own dependency on ember-cli-babel to latest may also get these addons to use it
        // as well. Otherwise, there is an unnecessary copy in the tree and it needs to be deduped.
        suggestions.push(
          'If using yarn, run `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.'
        );

        suggestions.push('If using npm, run `npm dedupe`.');

        hasActionableSuggestions = true;
      }

      if (incompatibleTopLevelAddons.length > 0) {
        suggestions.push([
          'Upgrade the following addons to the latest version:',
          incompatibleTopLevelAddons,
        ]);

        hasActionableSuggestions = true;
      }

      if (!hasActionableSuggestions) {
        suggestions.push([
          'Upgrade the following addons to the latest version, if available:',
          dormantTopLevelAddons,
        ]);
      }
    }

    this.addonsInfo = _addonsInfo;
    this.projectInfo = projectInfo;
    this.groupedByTopLevel = groupedByTopLevel;
    this.groupedByVersion = groupedByVersion;
    this.dormantTopLevelAddons = dormantTopLevelAddons;
    this.compatibleTopLevelAddons = compatibleTopLevelAddons;
    this.incompatibleTopLevelAddons = incompatibleTopLevelAddons;
    this.suggestions = suggestions;
    this.hasActionableSuggestions = hasActionableSuggestions;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get hasOverrides() {
    return this.addonsInfo.length > 0;
  }

  get hasBuildTimeWarning() {
    return this.hasActionableSuggestions;
  }

  get hasCompatibleAddons() {
    return this.addonsInfo.some((info) => info.compatible);
  }

  get hasDormantAddons() {
    return this.addonsInfo.some((info) => info.dormant);
  }

  get showAllEmberGlobalDeprecations() {
    return !this.hasActionableSuggestions || this.options.showAllEmberGlobalDeprecations;
  }

  get details() {
    let details =
      '\n### Details ###\n\n' +
      'Prior to v7.26.6, ember-cli-babel sometimes transpiled imports into the equivalent Ember Global API, ' +
      'potentially triggering this deprecation message indirectly, ' +
      'even when you did not observe these deprecated usages in your code.\n\n' +
      'The following outdated versions are found in your project:\n\n' +
      Overrides.printList(this.outdated);

    if (this.hasDormantAddons) {
      details +=
        '\nNote: Addons marked as "Dormant" does not appear to have any JavaScript files. ' +
        'Therefore, even if they are using an old version ember-cli-babel, they are ' +
        'unlikely to be the culprit of this deprecation and can likely be ignored.\n';
    }

    if (this.hasCompatibleAddons) {
      details += `\nNote: Addons marked as "Compatible" are already compatible with ember-cli-babel@7.26.6. `;

      if (this.projectInfo) {
        details += 'Try upgrading your `devDependencies` on `ember-cli-babel` to `^7.26.6`.\n';
      } else {
        details +=
          'If using yarn, try running `npx yarn-deduplicate --packages ember-cli-babel` followed by `yarn install`.' +
          'If using npm, try running `npm dedupe`.\n';
      }
    }

    return details;
  }

  get outdated() {
    let list = [];

    let groupedByVersion = this.groupedByVersion;

    for (let version of Object.keys(groupedByVersion).sort(semver.compare)) {
      let addons = [];

      for (let parent of Object.keys(groupedByVersion[version]).sort()) {
        let info = groupedByVersion[version][parent][0];
        let addon;
        let details = [];

        if (info.dormant) {
          addon = `${parent} (Dormant)`;
        } else if (info.compatible) {
          addon = `${parent} (Compatible)`;
        } else {
          addon = parent;
        }

        details.push(`Depends on ember-cli-babel@${info.requirement}`);

        for (let info of groupedByVersion[version][parent]) {
          let addedBy = info.path.slice(0, -1);

          if (addedBy.length) {
            details.push(`Added by ${addedBy.join(' > ')}`);
          }
        }

        addons.push([addon, details]);
      }

      list.push([`ember-cli-babel@${version}, currently used by:`, addons]);
    }

    return list;
  }

  get globalMessage() {
    let message =
      'Usage of the Ember Global is deprecated. ' +
      'You should import the Ember module or the specific API instead.\n\n' +
      'See https://deprecations.emberjs.com/v3.x/#toc_ember-global for details.\n\n' +
      'Usages of the Ember Global may be caused by an outdated ember-cli-babel dependency. ' +
      'The following steps may help:\n\n' +
      Overrides.printList(this.suggestions);

    if (!this.showAllEmberGlobalDeprecations) {
      message +=
        '\n### Important ###\n\n' +
        'In order to avoid repeatedly showing the same deprecation messages, ' +
        'no further deprecation messages will be shown for usages of the Ember Global ' +
        'until ember-cli-babel is upgraded to v7.26.6 or above.\n\n' +
        'To see all instances of this deprecation message, ' +
        'set the `EMBER_GLOBAL_DEPRECATIONS` environment variable to "all", ' +
        'e.g. `EMBER_GLOBAL_DEPRECATIONS=all ember test`.\n';
    }

    message += this.details;

    return message;
  }

  get buildTimeWarning() {
    if (this.hasBuildTimeWarning) {
      return `[DEPRECATION] ${this.globalMessage}`;
    } else {
      return '';
    }
  }

  toTree() {
    if (this.hasOverrides) {
      return createFile('packages/@ember/-internals/overrides/index.js', this.toModule());
    }
  }

  toModule() {
    return `
      ${this.toJS()};
    `;
  }

  toJS() {
    return `
      function once(callback) {
        let called = false;

        return (...args) => {
          if (called) {
            return null;
          } else {
            called = true;
            return callback(...args);
          }
        };
      }

      ${this.onDotAcces}
    `;
  }
};
