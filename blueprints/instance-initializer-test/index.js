'use strict';

const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an instance initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: ['Unit', 'Instance Initializer', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix)
    };
  }
});
