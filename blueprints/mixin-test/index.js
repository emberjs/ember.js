'use strict';

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',
  locals: function(options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: ['Unit', 'Mixin', options.entity.name].join(' | ')
    };
  }
});
