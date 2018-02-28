'use strict';

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a service unit test.',
  locals: function(options) {
    return {
      friendlyTestDescription: ['Unit', 'Service', options.entity.name].join(' | ')
    };
  },
});
