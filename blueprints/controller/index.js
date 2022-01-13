'use strict';

module.exports = {
  description: 'Generates a controller.',

  shouldTransformTypeScript: true,

  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
