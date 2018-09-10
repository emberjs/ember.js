'use strict';

const path = require('path');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = {
  description: 'Generates an initializer.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error('Pods arenʼt supported within a module unification app');
          } else if (options.inDummy) {
            return path.join('tests', 'dummy', 'src/init');
          }
          return 'src/init';
        },
      };
    }
  },
};
