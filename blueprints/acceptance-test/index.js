/* eslint-env node */

var testInfo    = require('ember-cli-test-info');
var pathUtil    = require('ember-cli-path-utils');
var stringUtils = require('ember-cli-string-utils');
var existsSync  = require('exists-sync');
var path        = require('path');
var useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an acceptance test for a feature.',

  locals: function(options) {
    var testFolderRoot = stringUtils.dasherize(options.project.name());

    if (options.project.isEmberCLIAddon()) {
      testFolderRoot = pathUtil.getRelativeParentPath(options.entity.name, -1, false);
    }

    var destroyAppExists =
      existsSync(path.join(this.project.root, '/tests/helpers/destroy-app.js'));

    return {
      testFolderRoot: testFolderRoot,
      friendlyTestName: testInfo.name(options.entity.name, 'Acceptance', null),
      destroyAppExists: destroyAppExists
    };
  }
});
