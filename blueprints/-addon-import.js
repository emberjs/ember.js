/* eslint-env node */

var stringUtil  = require('ember-cli-string-utils');
var path        = require('path');
var inflector   = require('inflection');

module.exports = {
  description: 'Generates an import wrapper.',

  fileMapTokens: function() {
    return {
      __name__: function(options) {
        if (options.pod && options.hasPathToken) {
          return options.locals.blueprintName;
        }
        return options.dasherizedModuleName;
      },
      __path__: function(options) {
        if (options.pod && options.hasPathToken) {
          return path.join(options.podPath, options.dasherizedModuleName);
        }
        return inflector.pluralize(options.locals.blueprintName);
      },
      __root__: function(options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      }
    };
  },

  locals: function(options) {
    var addonRawName       = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    var addonName          = stringUtil.dasherize(addonRawName);
    var fileName           = stringUtil.dasherize(options.entity.name);
    var blueprintName      = options.originBlueprintName;
    var modulePathSegments = [addonName, inflector.pluralize(options.originBlueprintName), fileName];

    if (blueprintName.match(/-addon/)) {
      blueprintName = blueprintName.substr(0, blueprintName.indexOf('-addon'));
      modulePathSegments = [addonName, inflector.pluralize(blueprintName), fileName];
    }

    if (options.pod) {
      modulePathSegments = [addonName, fileName, blueprintName];
    }

    return {
      modulePath: modulePathSegments.join('/'),
      blueprintName: blueprintName
    };
  }
};
