'use strict';

module.exports = {
  description: 'Generates a template.',

  normalizeEntityName(entityName) {
    return entityName.replace(/\.hbs$/, ''); //Prevent generation of ".hbs.hbs" files
  },
};
