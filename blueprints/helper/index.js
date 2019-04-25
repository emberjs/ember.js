'use strict';

const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const normalizeEntityName = require('ember-cli-normalize-entity-name');

const path = require('path');

module.exports = {
  description: 'Generates a helper function.',

  filesPath() {
    let rootPath = isModuleUnificationProject(this.project) ? 'mu-files' : 'files';
    return path.join(this.path, rootPath);
  },

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
            return path.join('tests', 'dummy', 'src');
          }

          return 'src';
        },
        __collection__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          return path.join('ui', 'components');
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
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
