/* eslint-env node */

var testInfo                 = require('ember-cli-test-info');
var stringUtils              = require('ember-cli-string-utils');
var isPackageMissing         = require('ember-cli-is-package-missing');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a helper integration test or a unit test.',

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
      }
    };
  },

  locals: function(options) {
    var testType = options.testType || 'integration';
    var testName = testType === 'integration' ? 'Integration' : 'Unit';
    var friendlyTestName = testInfo.name(options.entity.name, testName, 'Helper');

    return {
      friendlyTestName: friendlyTestName,
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix),
      testType: testType
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
