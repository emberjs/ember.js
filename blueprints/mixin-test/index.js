/* eslint-env node */

var testInfo = require('ember-cli-test-info');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',
  locals: function(options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: testInfo.name(options.entity.name, 'Unit', 'Mixin')
    };
  }
});
