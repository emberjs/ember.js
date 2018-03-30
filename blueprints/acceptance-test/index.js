'use strict';

const fs = require('fs');
const path = require('path');
const pathUtil = require('ember-cli-path-utils');
const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an acceptance test for a feature.',

  locals: function(options) {
    let testFolderRoot = stringUtils.dasherize(options.project.name());

    if (options.project.isEmberCLIAddon()) {
      testFolderRoot = pathUtil.getRelativeParentPath(options.entity.name, -1, false);
    }

    let destroyAppExists = fs.existsSync(
      path.join(this.project.root, '/tests/helpers/destroy-app.js')
    );

    let friendlyTestName = [
      'Acceptance',
      stringUtils.dasherize(options.entity.name).replace(/[-]/g, ' '),
    ].join(' | ');

    return {
      testFolderRoot: testFolderRoot,
      friendlyTestName,
      destroyAppExists,
    };
  },
});
