'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = {
  description: 'Generates a template.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          } else if (options.inDummy) {
            return 'tests/dummy/src/ui/routes';
          } else {
            return 'src/ui/routes';
          }
        },

        __path__(options) {
          return options.dasherizedModuleName;
        },

        __name__() {
          return 'template';
        },
      };
    }
  },
};
