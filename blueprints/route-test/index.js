'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a route unit test.',

  availableOptions: [
    {
      name: 'reset-namespace',
      type: Boolean,
    },
  ],

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'unit';
      },
      __test__: function (options) {
        let moduleName = options.locals.moduleName;

        if (options.pod) {
          moduleName = 'route';
        }

        return `${moduleName}-test`;
      },
      __path__: function (options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.moduleName);
        }
        return 'routes';
      },
    };
  },

  locals: function (options) {
    let moduleName = options.entity.name;

    if (options.resetNamespace) {
      moduleName = moduleName.split('/').pop();
    }

    return {
      friendlyTestDescription: ['Unit', 'Route', options.entity.name].join(' | '),
      moduleName: stringUtil.dasherize(moduleName),
    };
  },
});
