/* eslint-env node */

var path          = require('path');
var testInfo      = require('ember-cli-test-info');
var stringUtil    = require('ember-cli-string-utils');
var isPackageMissing = require('ember-cli-is-package-missing');
var getPathOption = require('ember-cli-get-component-path-option');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a component integration or unit test.',

  availableOptions: [
    {
      name: 'test-type',
      type: ['integration', 'unit'],
      default: 'integration',
      aliases: [
        { 'i': 'integration' },
        { 'u': 'unit' },
        { 'integration': 'integration' },
        { 'unit': 'unit' }
      ]
    }
  ],

  fileMapTokens: function() {
    return {
      __testType__: function(options) {
        return options.locals.testType || 'integration';
      },
      __path__: function(options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
        }
        return 'components';
      }
    };
  },
  locals: function(options) {
    var dasherizedModuleName = stringUtil.dasherize(options.entity.name);
    var componentPathName = dasherizedModuleName;
    var testType = options.testType || 'integration';
    var friendlyTestDescription = testInfo.description(options.entity.name, 'Integration', 'Component');

    if (options.pod && options.path !== 'components' && options.path !== '') {
      componentPathName = [options.path, dasherizedModuleName].filter(Boolean).join('/');
    }

    if (options.testType === 'unit') {
      friendlyTestDescription = testInfo.description(options.entity.name, 'Unit', 'Component');
    }

    return {
      path: getPathOption(options),
      testType: testType,
      componentPathName: componentPathName,
      friendlyTestDescription: friendlyTestDescription
    };
  },
  afterInstall: function(options) {
    if (!options.dryRun && options.testType === 'integration' && isPackageMissing(this, 'ember-cli-htmlbars-inline-precompile')) {
      return this.addPackagesToProject([
        { name: 'ember-cli-htmlbars-inline-precompile', target: '^0.3.1' }
      ]);
    }
  }
});
