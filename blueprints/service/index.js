'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const stringUtil = require('ember-cli-string-utils');

module.exports = {
  description: 'Generates a service.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          return 'src';
        },
      };
    }
  },

  locals(options) {
    return {
      className: stringUtil.classify(options.entity.name),
    };
  },
};
