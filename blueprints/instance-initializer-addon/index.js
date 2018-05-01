'use strict';

let addonImport = require('../-addon-import');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

addonImport.fileMapTokens = function() {
  if (isModuleUnificationProject(this.project)) {
    return {
      __root__() {
        return 'src/init';
      },
    };
  }
};

module.exports = addonImport;
