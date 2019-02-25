'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = {
  description: 'Generates a simple utility module/function.',

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
    }
  },
};
