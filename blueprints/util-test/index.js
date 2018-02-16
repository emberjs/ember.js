'use strict';

const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a util unit test.',
  locals: function(options) {
    return {
      friendlyTestName: ['Unit', 'Utility', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix)
    };
  }
});
