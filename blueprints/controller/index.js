'use strict';

const useEditionDetector = require('../edition-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const path = require('path');

module.exports = useEditionDetector({
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
});
