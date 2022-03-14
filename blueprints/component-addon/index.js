'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

module.exports = {
  description: 'Generates a component.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },

  fileMapTokens: function () {
    return {
      __path__: function (options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'components';
      },
      __name__: function (options) {
        if (options.pod) {
          return 'component';
        }
        return options.dasherizedModuleName;
      },
      __root__: function (options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      },
      __templatepath__: function (options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'templates/components';
      },
      __templatename__: function (options) {
        if (options.pod) {
          return 'template';
        }
        return options.dasherizedModuleName;
      },
    };
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(entityName);
  },

  locals: function (options) {
    let addonRawName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let addonName = stringUtil.dasherize(addonRawName);
    let fileName = stringUtil.dasherize(options.entity.name);
    let importPathName = [addonName, 'components', fileName].join('/');
    let templatePath = '';

    if (options.pod) {
      importPathName = [addonName, 'components', fileName, 'component'].join('/');
    }

    if (this.project.isEmberCLIAddon() || (options.inRepoAddon && !options.inDummy)) {
      if (options.pod) {
        templatePath = './template';
      } else {
        templatePath = [addonName, 'templates/components', fileName].join('/');
      }
    }

    return {
      modulePath: importPathName,
      templatePath,
      path: getPathOption(options),
    };
  },
};
