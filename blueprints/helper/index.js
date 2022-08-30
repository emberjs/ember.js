'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

module.exports = {
  description: 'Generates a helper function.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
