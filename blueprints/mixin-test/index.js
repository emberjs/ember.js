/*jshint node:true*/

var testInfo = require('ember-cli-test-info');

module.exports = {
  description: 'Generates a mixin unit test.',
  locals: function(options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: testInfo.name(options.entity.name, 'Unit', 'Mixin')
    };
  }
};
