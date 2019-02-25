'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');

module.exports = {
  description: 'Generates a component.',

  fileMapTokens: function() {
    return {
      __path__: function(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'components';
      },
      __name__: function(options) {
        if (options.pod) {
          return 'component';
        }
        return options.dasherizedModuleName;
      },
      __root__: function(options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      },
    };
  },

  normalizeEntityName: function(entityName) {
    return normalizeEntityName(entityName);
  },

  locals: function(options) {
    let addonRawName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let addonName = stringUtil.dasherize(addonRawName);
    let fileName = stringUtil.dasherize(options.entity.name);
    let importPathName = [addonName, 'components', fileName].join('/');

    if (options.pod) {
      importPathName = [addonName, 'components', fileName, 'component'].join('/');
    }

    return {
      modulePath: importPathName,
      path: getPathOption(options),
    };
  },
};
