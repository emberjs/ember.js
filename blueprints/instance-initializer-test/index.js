/* eslint-env node */

var testInfo = require('ember-cli-test-info');
var stringUtils = require('ember-cli-string-utils');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an instance initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: testInfo.name(options.entity.name, 'Unit', 'Instance Initializer'),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix)
    };
  }
});
