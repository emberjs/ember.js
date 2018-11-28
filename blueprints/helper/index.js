'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const normalizeEntityName = require('ember-cli-normalize-entity-name');

const path = require('path');

module.exports = {
  description: 'Generates a helper function.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          if (options.inRepoAddon) {
            return path.join('packages', options.inRepoAddon, 'src');
          }

          if (options.inDummy) {
            throw new Error("The --dummy flag isn't supported within a module unification app");
          }

          return 'src';
        },
        __collection__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          return 'ui/components';
        },
      };
    } else {
      return {
        __collection__() {
          return 'helpers';
        },
      };
    }
  },

  normalizeEntityName: function(entityName) {
    return normalizeEntityName(entityName);
  },
};
