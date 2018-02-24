'use strict';

const stringUtil = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',
  locals: function(options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let controllerPathName = dasherizedModuleName;
    return {
      controllerPathName: controllerPathName,
      friendlyTestDescription: ['Unit', 'Controller', dasherizedModuleName].join(' | ')
    };
  }
});
