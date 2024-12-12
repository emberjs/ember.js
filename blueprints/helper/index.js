'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');

const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

module.exports = {
  description: 'Generates a helper function.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
