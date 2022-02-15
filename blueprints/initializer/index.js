'use strict';

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

module.exports = {
  description: 'Generates an initializer.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },
};
