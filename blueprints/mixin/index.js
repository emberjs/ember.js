'use strict';

module.exports = {
  description: 'Generates a mixin.',

  normalizeEntityName(entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
