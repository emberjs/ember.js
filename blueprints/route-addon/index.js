'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const inflector = require('inflection');

module.exports = {
  description: 'Generates import wrappers for a route and its template.',

  fileMapTokens: function() {
    return {
      __templatepath__: function(options) {
        if (options.pod) {
          return path.join(options.podPath, options.dasherizedModuleName);
        }
        return 'templates';
      },
      __templatename__: function(options) {
        if (options.pod) {
          return 'template';
        }
        return options.dasherizedModuleName;
      },
      __name__: function(options) {
        if (options.pod) {
          return 'route';
        }

        return options.dasherizedModuleName;
      },
      __path__: function(options) {
        if (options.pod && options.hasPathToken) {
          return path.join(options.podPath, options.dasherizedModuleName);
        }

        return 'routes';
      },
      __root__: function(options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }

        return 'app';
      },
    };
  },

  locals: function(options) {
    let locals = {};
    let addonRawName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let addonName = stringUtil.dasherize(addonRawName);
    let fileName = stringUtil.dasherize(options.entity.name);

    ['route', 'template'].forEach(function(blueprint) {
      let pathName = [addonName, inflector.pluralize(blueprint), fileName].join('/');

      if (options.pod) {
        pathName = [addonName, fileName, blueprint].join('/');
      }

      locals[blueprint + 'ModulePath'] = pathName;
    });

    return locals;
  },
};
