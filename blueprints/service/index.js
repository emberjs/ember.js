'use strict';

const path = require('path');
const useEditionDetector = require('../edition-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useEditionDetector({
  description: 'Generates a service.',

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
  normalizeEntityName: function(entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
});
