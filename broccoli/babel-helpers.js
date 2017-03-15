'use strict';
/* eslint-env node */
const Funnel = require('broccoli-funnel');

module.exports = function(env) {
  let file;
  if (env === 'debug') {
    file = 'external-helpers-dev.js';
  } else if (env === 'prod') {
    file = 'external-helpers-prod.js'
  }

  return new Funnel('packages/external-helpers/lib', {
    files: [file],
    getDestinationPath() {
      return 'ember-babel.js';
    }
  });
}