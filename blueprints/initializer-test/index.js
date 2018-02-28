'use strict';

const path = require('path');
const stringUtils = require('ember-cli-string-utils');
const existsSync = require('exists-sync');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates an initializer unit test.',
  locals: function(options) {
    return {
      friendlyTestName: ['Unit', 'Initializer', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix),
      destroyAppExists: existsSync(path.join(this.project.root, '/tests/helpers/destroy-app.js'))
    };
  }
});
