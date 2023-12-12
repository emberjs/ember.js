'use strict';

const path = require('path');

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');
const { modulePrefixForProject } = require('../-utils');
const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a util unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
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
      modulePrefix: modulePrefixForProject(options.project),
    };
  },
});
