const semver = require('semver');

function* walkAddonTree(project, pathToAddon = []) {
  for (let addon of project.addons) {
    yield [addon, pathToAddon];
    yield* walkAddonTree(addon, [...pathToAddon, `${addon.name}@${addon.pkg.version}`]);
  }
}

function requirementFor(pkg, deps = {}) {
  return deps[pkg];
}

module.exports = function (project) {
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
  })(project.root);

  let groupedByTopLevelAddon = Object.create(null);
  let groupedByVersion = Object.create(null);
  let projectInfo;

  for (let [addon, pathToAddon] of walkAddonTree(project)) {
    let version = addon.pkg.version;

    if (addon.name === 'ember-cli-babel' && semver.lt(version, '7.26.6')) {
      let info;

      if (addon.parent === project) {
        let requirement = requirementFor('ember-cli-babel', project.pkg.devDependencies);
        let compatible = semver.satisfies('7.26.6', requirement);

        info = projectInfo = {
          parent: `${project.name()} (your app)`,
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

        while (topLevelAddon.parent !== project) {
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

  let shouldIssueSingleDeprecation =
    hasActionableSuggestions && process.env.EMBER_GLOBAL_DEPRECATIONS !== 'all';

  let bootstrap = `require('@ember/-internals/bootstrap').default()`;

  if (shouldIssueSingleDeprecation) {
    bootstrap = `
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
  }

  return {
    globalMessage,
    hasActionableSuggestions,
    shouldIssueSingleDeprecation,
    bootstrap,
  };
};
