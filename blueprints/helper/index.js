'use strict';

const normalizeEntityName = require('ember-cli-normalize-entity-name');

module.exports = {
  description: 'Generates a helper function.',

  fileMapTokens() {
    return {
      __collection__() {
        return 'helpers';
      },
    };
  },

  normalizeEntityName(entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
