'use strict';

const stringUtils = require('ember-cli-string-utils');
const isPackageMissing = require('ember-cli-is-package-missing');
const semver = require('semver');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a helper integration test.',

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'integration';
      },
      __collection__() {
        return 'helpers';
      },
    };
  },

  locals: function (options) {
    let friendlyTestName = ['Integration', 'Helper', options.entity.name].join(' | ');
    let dasherizedModulePrefix = stringUtils.dasherize(options.project.config().modulePrefix);

    let hbsImportStatement = this._useNamedHbsImport()
      ? "import { hbs } from 'ember-cli-htmlbars';"
      : "import hbs from 'htmlbars-inline-precompile';";

    return {
      friendlyTestName,
      dasherizedModulePrefix,
      hbsImportStatement,
    };
  },

  _useNamedHbsImport() {
    let htmlbarsAddon = this.project.addons.find((a) => a.name === 'ember-cli-htmlbars');

    if (htmlbarsAddon && semver.gte(htmlbarsAddon.pkg.version, '4.0.0-alpha.1')) {
      return true;
    }

    return false;
  },

  afterInstall: function (options) {
    if (
      !options.dryRun &&
      !this._useNamedHbsImport() &&
      isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')
    ) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' },
      ]);
    }
  },
});
