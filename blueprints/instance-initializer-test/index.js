/*jshint node:true*/

var getDependencyDepth = require('../../lib/utilities/get-dependency-depth');
var testInfo = require('ember-cli-test-info');

module.exports = {
  description: 'Generates an instance initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: testInfo.name(options.entity.name, "Unit", "Instance Initializer"),
      dependencyDepth: getDependencyDepth(options)
    };
  }
};
