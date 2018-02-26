'use strict';
/* eslint-env node */
const Funnel = require('broccoli-funnel');
const StringReplace = require('broccoli-string-replace');
const FEATURES = require('./features');

module.exports = function testIndexHTML() {
  let index = new Funnel('tests', {
    files: ['index.html'],
    destDir: 'tests',
    annotation: 'tests/index.html'
  });
  index = new StringReplace(index, {
    files: ['tests/index.html'],
    patterns: [{
      match: /\{\{DEV_FEATURES\}\}/g,
      replacement: JSON.stringify(FEATURES.DEBUG)
    }, {
      match: /\{\{PROD_FEATURES\}\}/g,
      replacement: JSON.stringify(FEATURES.RELEASE)
    }],
  });
  index._annotation = 'tests/index.html FEATURES';
  return index;
}