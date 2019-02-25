'use strict';

const stringUtil = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a controller unit test.',
  locals: function(options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let controllerPathName = dasherizedModuleName;

    return {
      controllerPathName: controllerPathName,
      friendlyTestDescription: ['Unit', 'Controller', dasherizedModuleName].join(' | '),
    };
  },
  fileMapTokens: function() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __test__() {
          return 'controller-test';
        },
        __testType__() {
          return '';
        },
        __root__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }
          return 'src';
        },
        __path__(options) {
          return path.join('ui', 'routes', options.dasherizedModuleName);
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__() {
          return 'unit';
        },
        __path__(options) {
          if (options.pod) {
            return path.join(options.podPath, options.dasherizedModuleName);
          }
          return 'controllers';
        },
      };
    }
  },
});
