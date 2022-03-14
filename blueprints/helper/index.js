'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');
const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');

const path = require('path');

module.exports = {
  description: 'Generates a helper function.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  filesPath() {
    let rootPath = 'files';
    return path.join(this.path, rootPath);
  },

  fileMapTokens() {
    return {
      __collection__() {
        return 'helpers';
      },
    };
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
