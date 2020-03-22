'use strict';

const path = require('path');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          return 'src';
        },
        __testType__() {
          return 'mixins';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__() {
          return path.join('unit', 'mixins');
        },
      };
    }
  },

  locals: function(options) {
    return {
      projectName: options.inRepoAddon ? options.inRepoAddon : options.project.name(),
      friendlyTestName: ['Unit', 'Mixin', options.entity.name].join(' | '),
    };
  },
});
