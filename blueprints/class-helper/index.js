'use strict';
/* eslint-env node */
var normalizeEntityName = require('ember-cli-normalize-entity-name');

module.exports = {
  description: 'Generates a class-based helper.',
  normalizeEntityName: function(entityName) {
    return normalizeEntityName(entityName);
  }
};
