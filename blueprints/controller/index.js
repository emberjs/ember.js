'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const path = require('path');

module.exports = {
  description: 'Generates a controller.',
  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }
          if (options.inDummy) {
            return path.join('tests', 'dummy', 'src');
          }
          return 'src';
        },
        __path__(options) {
          return path.join('ui', 'routes', options.dasherizedModuleName);
        },
        __name__() {
          return 'controller';
        },
      };
    }
  },
};
