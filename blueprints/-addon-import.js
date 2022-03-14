'use strict';

const stringUtil = require('ember-cli-string-utils');
const path = require('path');
const inflector = require('inflection');

const maybePolyfillTypeScriptBlueprints = require('./-maybe-polyfill-typescript-blueprints');

module.exports = {
  description: 'Generates an import wrapper.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },

  fileMapTokens: function () {
    return {
      __name__: function (options) {
        return options.dasherizedModuleName;
      },
      __path__: function (options) {
        return inflector.pluralize(options.locals.blueprintName);
      },
      __root__: function (options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      },
    };
  },

  locals: function (options) {
    let addonRawName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let addonName = stringUtil.dasherize(addonRawName);
    let fileName = stringUtil.dasherize(options.entity.name);
    let blueprintName = options.originBlueprintName;
    let modulePathSegments = [
      addonName,
      inflector.pluralize(options.originBlueprintName),
      fileName,
    ];

    if (blueprintName.match(/-addon/)) {
      blueprintName = blueprintName.substr(0, blueprintName.indexOf('-addon'));
      modulePathSegments = [addonName, inflector.pluralize(blueprintName), fileName];
    }

    return {
      modulePath: modulePathSegments.join('/'),
      blueprintName: blueprintName,
    };
  },
};
