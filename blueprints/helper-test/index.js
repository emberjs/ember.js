'use strict';

const stringUtils = require('ember-cli-string-utils');
const isPackageMissing = require('ember-cli-is-package-missing');
const semver = require('semver');

const useTestFrameworkDetector = require('../test-framework-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;

const path = require('path');

module.exports = useTestFrameworkDetector({
  description: 'Generates a helper integration test or a unit test.',

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
        __root__(options) {
          if (options.inRepoAddon) {
            return path.join('packages', options.inRepoAddon, 'src');
          }

          if (options.inDummy) {
            throw new Error("The --dummy flag isn't supported within a module unification app");
          }

          return 'src';
        },
        __testType__() {
          return '';
        },
        __collection__() {
          return 'ui/components';
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
        __collection__() {
          return 'helpers';
        },
      };
    }
  },

  locals: function(options) {
    let testType = options.testType || 'integration';
    let testName = testType === 'integration' ? 'Integration' : 'Unit';
    let friendlyTestName = [testName, 'Helper', options.entity.name].join(' | ');
    let dasherizedModulePrefix;

    if (
      isModuleUnificationProject(options.project) &&
      (options.project.isEmberCLIAddon() || options.inRepoAddon)
    ) {
      dasherizedModulePrefix = options.inRepoAddon || options.project.name();
    } else {
      dasherizedModulePrefix = stringUtils.dasherize(options.project.config().modulePrefix);
    }

    let hbsImportStatement = this._useNamedHbsImport()
      ? "import { hbs } from 'ember-cli-htmlbars';"
      : "import hbs from 'htmlbars-inline-precompile';";

    return {
      testType,
      friendlyTestName,
      dasherizedModulePrefix,
      hbsImportStatement,
    };
  },

  _useNamedHbsImport() {
    let htmlbarsAddon = this.project.addons.find(a => a.name === 'ember-cli-htmlbars');

    if (htmlbarsAddon && semver.gte(htmlbarsAddon.pkg.version, '4.0.0-alpha.1')) {
      return true;
    }

    return false;
  },

  afterInstall: function(options) {
    if (
      !options.dryRun &&
      options.testType === 'integration' &&
      !this._useNamedHbsImport() &&
      isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')
    ) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' },
      ]);
    }
  },
});
