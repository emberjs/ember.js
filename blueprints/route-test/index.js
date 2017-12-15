'use strict';

/* eslint-env node */

const testInfo = require('ember-cli-test-info');
const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a route unit test.',

  availableOptions: [
    {
      name: 'reset-namespace',
      type: Boolean
    }
  ],

  fileMapTokens: function() {
    return {
      __test__: function (options) {
        let moduleName = options.locals.moduleName;

        if (options.pod) {
          moduleName = 'route';
        }

        return `${moduleName}-test`;
      },
      __path__: function(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.moduleName);
        }
        return 'routes';
      }
    };
  },

  locals: function(options) {
    let moduleName = options.entity.name;

    if (options.resetNamespace) {
      moduleName = moduleName.split('/').pop();
    }

    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Route'),
      moduleName: stringUtil.dasherize(moduleName)
    };
  },
});
