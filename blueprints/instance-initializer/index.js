'use strict';

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

module.exports = {
  shouldTransformTypeScript: true,

  description: 'Generates an instance initializer.',

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },
};
