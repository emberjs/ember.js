'use strict';

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

module.exports = {
  shouldTransformTypeScript: true,

  description: 'Generates an instance initializer.',

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },
};
