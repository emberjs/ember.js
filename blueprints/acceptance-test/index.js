/* eslint-env node */

const path = require('path');
const testInfo = require('ember-cli-test-info');
const pathUtil = require('ember-cli-path-utils');
const stringUtils = require('ember-cli-string-utils');
const existsSync = require('exists-sync');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an acceptance test for a feature.',

  locals: function(options) {
    let testFolderRoot = stringUtils.dasherize(options.project.name());

    if (options.project.isEmberCLIAddon()) {
      testFolderRoot = pathUtil.getRelativeParentPath(options.entity.name, -1, false);
    }

    let destroyAppExists =
      existsSync(path.join(this.project.root, '/tests/helpers/destroy-app.js'));

    return {
      testFolderRoot: testFolderRoot,
      friendlyTestName: testInfo.name(options.entity.name, 'Acceptance', null),
      destroyAppExists: destroyAppExists
    };
  }
});
