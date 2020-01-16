'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const isPackageMissing = require('ember-cli-is-package-missing');
const getPathOption = require('ember-cli-get-component-path-option');
const semver = require('semver');

const useTestFrameworkDetector = require('../test-framework-detector');

function invocationFor(options) {
  let parts = options.entity.name.split('/');
  return parts.map(p => stringUtil.classify(p)).join('::');
}

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
    }

    let hbsImportStatement = this._useSeparateInlinePrecompileAddon()
      ? "import hbs from 'htmlbars-inline-precompile';"
      : "import { hbs } from 'ember-cli-htmlbars';";

    let templateInvocation = invocationFor(options);
    let componentName = templateInvocation;
    let openComponent = descriptor => `<${descriptor}>`;
    let closeComponent = descriptor => `</${descriptor}>`;
    let selfCloseComponent = descriptor => `<${descriptor} />`;

    return {
      path: getPathOption(options),
      testType: testType,
      componentName,
      componentPathName,
      templateInvocation,
      openComponent,
      closeComponent,
      selfCloseComponent,
      friendlyTestDescription,
      hbsImportStatement,
    };
  },

  _useSeparateInlinePrecompileAddon() {
    let htmlbarsAddon = this.project.addons.find(a => a.name === 'ember-cli-htmlbars');

    if (htmlbarsAddon === undefined) {
      return true;
    } else if (semver.gte(htmlbarsAddon.pkg.version, '4.0.0-alpha.1')) {
      return false;
    }
  },

  afterInstall: function(options) {
    if (
      !options.dryRun &&
      options.testType === 'integration' &&
      this._useSeparateInlinePrecompileAddon() &&
      isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')
    ) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' },
      ]);
    }
  },
});
