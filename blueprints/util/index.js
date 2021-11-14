'use strict';

module.exports = {
  description: 'Generates a simple utility module/function.',
  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
