'use strict';

const useEditionDetector = require('../edition-detector');

module.exports = useEditionDetector({
  description: 'Generates a service.',

  normalizeEntityName(entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
});
