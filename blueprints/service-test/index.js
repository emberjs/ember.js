'use strict';

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');
const useTestFrameworkDetector = require('../test-framework-detector');

module.exports = useTestFrameworkDetector({
  description: 'Generates a service unit test.',

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
        return 'unit';
      },
    };
  },

  locals(options) {
    return {
      friendlyTestDescription: ['Unit', 'Service', options.entity.name].join(' | '),
    };
  },
});
