'use strict';

const stringUtils = require('ember-cli-string-utils');
const path = require('path');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates a util unit test.',

  fileMapTokens() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }

          return 'src';
        },
        __testType__() {
          return 'utils';
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__() {
          return path.join('unit', 'utils');
        },
      };
    }
  },

  locals: function(options) {
    return {
      friendlyTestName: ['Unit', 'Utility', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix),
    };
  },
});
