'use strict';

const stringUtil = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');
const path = require('path');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');
const { modulePrefixForProject } = require('../-utils');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  locals: function (options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let controllerPathName = dasherizedModuleName;

    return {
      modulePrefix: modulePrefixForProject(options.project),
      controllerPathName: controllerPathName,
      friendlyTestDescription: ['Unit', 'Controller', dasherizedModuleName].join(' | '),
    };
  },
  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'unit';
      },
      __path__(options) {
        if (options.pod) {
          return path.join(options.podPath, options.dasherizedModuleName);
        }
        return 'controllers';
      },
    };
  },
});
