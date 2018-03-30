'use strict';

const fs = require('fs');
const path = require('path');
const stringUtils = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an instance initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: ['Unit', 'Instance Initializer', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix),
      destroyAppExists: fs.existsSync(
        path.join(this.project.root, '/tests/helpers/destroy-app.js')
      ),
    };
  },
});
