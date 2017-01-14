/* eslint-env node */

var testInfo = require('ember-cli-test-info');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',
  locals: function(options) {
    return {
      friendlyTestDescription: testInfo.description(options.entity.name, 'Unit', 'Controller')
    };
  }
});
