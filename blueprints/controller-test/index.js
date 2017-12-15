'use strict';

/* eslint-env node */

const stringUtil = require('ember-cli-string-utils');
const testInfo = require('ember-cli-test-info');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',
  locals: function(options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let controllerPathName = dasherizedModuleName;
    return {
      controllerPathName: controllerPathName,
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Controller')
    };
  }
});
