'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');

const maybePolyfillTypeScriptBlueprints = require('../-maybe-polyfill-typescript-blueprints');

const path = require('path');

module.exports = {
  description: 'Generates a helper function.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    maybePolyfillTypeScriptBlueprints(this);
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
