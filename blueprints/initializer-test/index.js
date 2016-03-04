/*jshint node:true*/

var testInfo = require('ember-cli-test-info');
var stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: 'Generates an initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: testInfo.name(options.entity.name, 'Unit', 'Initializer'),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix)
    };
  }
};
