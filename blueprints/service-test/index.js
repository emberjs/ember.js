'use strict';

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates a service unit test.',

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
          return '';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__() {
          return 'unit';
        },
      };
    }
  },

  locals(options) {
    return {
      friendlyTestDescription: ['Unit', 'Service', options.entity.name].join(' | '),
    };
  },
});
