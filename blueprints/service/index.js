'use strict';

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

module.exports = {
  description: 'Generates a service.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },

  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
