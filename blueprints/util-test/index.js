'use strict';

const stringUtils = require('ember-cli-string-utils');
const path = require('path');
const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a util unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  fileMapTokens() {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return path.join('unit', 'utils');
      },
    };
  },

  locals: function (options) {
    return {
      friendlyTestName: ['Unit', 'Utility', options.entity.name].join(' | '),
      dasherizedModulePrefix: stringUtils.dasherize(options.project.config().modulePrefix),
    };
  },
});
