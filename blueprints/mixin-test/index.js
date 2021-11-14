'use strict';

const path = require('path');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',

  fileMapTokens() {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return path.join('unit', 'mixins');
      },
    };
  },

  locals: function (options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: ['Unit', 'Mixin', options.entity.name].join(' | '),
    };
  },
});
