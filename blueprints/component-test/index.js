'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const isPackageMissing = require('ember-cli-is-package-missing');
const getPathOption = require('ember-cli-get-component-path-option');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

module.exports = useTestFrameworkDetector({
  description: 'Generates a component integration or unit test.',

  availableOptions: [
    {
      name: 'test-type',
      type: ['integration', 'unit'],
      default: 'integration',
      aliases: [
        { i: 'integration' },
        { u: 'unit' },
        { integration: 'integration' },
        { unit: 'unit' },
      ],
    },
  ],

  fileMapTokens: function() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __test__() {
          return 'component-test';
        },
        __root__(options) {
          if (options.inRepoAddon) {
            return path.join('packages', options.inRepoAddon, 'src');
          }
          return 'src';
        },
        __testType__(options) {
          if (options.locals.testType === 'unit') {
            throw new Error("The --unit flag isn't supported within a module unification app");
          }

          return '';
        },
        __path__(options) {
          if (options.pod) {
            throw new Error("Pods aren't supported within a module unification app");
          }
          return path.join('ui', 'components', options.dasherizedModuleName);
        },
      };
    } else {
      return {
        __root__() {
          return 'tests';
        },
        __testType__(options) {
          return options.locals.testType || 'integration';
        },
        __path__(options) {
          if (options.pod) {
            return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
          }
          return 'components';
        },
      };
    }
  },

  locals: function(options) {
    let dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    let componentPathName = dasherizedModuleName;
    let testType = options.testType || 'integration';

    let friendlyTestDescription = [
      testType === 'unit' ? 'Unit' : 'Integration',
      'Component',
      dasherizedModuleName,
    ].join(' | ');

    if (options.pod && options.path !== 'components' && options.path !== '') {
      componentPathName = [options.path, dasherizedModuleName].filter(Boolean).join('/');
    } else if (isModuleUnificationProject(this.project)) {
      if (options.inRepoAddon) {
        componentPathName = `${options.inRepoAddon}::${dasherizedModuleName}`;
      } else if (this.project.isEmberCLIAddon()) {
        componentPathName = `${this.project.pkg.name}::${dasherizedModuleName}`;
      }
    }

    return {
      path: getPathOption(options),
      testType: testType,
      componentPathName: componentPathName,
      friendlyTestDescription: friendlyTestDescription,
    };
  },

  afterInstall: function(options) {
    if (
      !options.dryRun &&
      options.testType === 'integration' &&
      isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')
    ) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' },
      ]);
    }
  },
});
