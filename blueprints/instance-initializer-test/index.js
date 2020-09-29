'use strict';

const fs = require('fs');
const path = require('path');
const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an instance initializer unit test.',

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'unit';
      },
    };
  },
  locals: function (options) {
    let modulePrefix = stringUtils.dasherize(options.project.config().modulePrefix);

    return {
      friendlyTestName: ['Unit', 'Instance Initializer', options.entity.name].join(' | '),
      modulePrefix,
      destroyAppExists: fs.existsSync(
        path.join(this.project.root, '/tests/helpers/destroy-app.js')
      ),
    };
  },
});
