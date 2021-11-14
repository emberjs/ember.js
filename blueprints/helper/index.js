'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');

const path = require('path');

module.exports = {
  description: 'Generates a helper function.',

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
