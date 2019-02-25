'use strict';

const fs = require('fs');
const path = require('path');
const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates an initializer unit test.',

  fileMapTokens: function() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__(options) {
          if (options.pod) {
            throw new Error('Pods arenʼt supported within a module unification app');
          } else if (options.inDummy) {
            return path.join('tests', 'dummy', 'src', 'init');
          }
          return path.join('src', 'init');
        },
        __testType__() {
          return '';
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
      };
    }
  },

  locals: function(options) {
    let modulePrefix = stringUtils.dasherize(options.project.config().modulePrefix);
    if (isModuleUnificationProject(this.project)) {
      modulePrefix += '/init';
    }
    return {
      friendlyTestName: ['Unit', 'Initializer', options.entity.name].join(' | '),
      modulePrefix,
      destroyAppExists: fs.existsSync(
        path.join(this.project.root, '/tests/helpers/destroy-app.js')
      ),
    };
  },
});
