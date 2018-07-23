'use strict';

const stringUtils = require('ember-cli-string-utils');

const path = require('path');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates a mixin unit test.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw "Pods aren't supported within a module unification app";
          }

          return 'src';
        },
        __testType__() {
          return 'mixins';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__() {
          return path.join('unit', 'mixins');
        },
      };
    }
  },

  locals: function(options) {
    let projectName = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    let dasherizedModulePrefix = options.inRepoAddon
      ? projectName
      : stringUtils.dasherize(options.project.config().modulePrefix);
    return {
      dasherizedModulePrefix,
      projectName,
      friendlyTestName: ['Unit', 'Mixin', options.entity.name].join(' | '),
    };
  },
});
