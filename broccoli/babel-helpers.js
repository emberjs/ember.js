'use strict';

const Funnel = require('broccoli-funnel');

module.exports = function() {
  return new Funnel('packages/external-helpers/lib', {
    files: ['external-helpers.js'],
    getDestinationPath() {
      return 'ember-babel.js';
    },
  });
};
