/* eslint-env node */

const testInfo = require('ember-cli-test-info');
const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',
  locals: function(options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: testInfo.name(options.entity.name, 'Unit', 'Mixin')
    };
  }
});
