'use strict';

module.exports = {
  description: 'Generates a controller.',
  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
