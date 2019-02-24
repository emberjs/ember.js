'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const path = require('path');

module.exports = {
  description: 'Generates a mixin.',

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
      };
    }
  },
};
