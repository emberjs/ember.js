'use strict';

module.exports = {
  description: 'Generates a service.',

  shouldTransformTypeScript: true,

  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
