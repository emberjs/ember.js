'use strict';

const stringUtil = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',
  locals: function (options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let controllerPathName = dasherizedModuleName;

    return {
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
