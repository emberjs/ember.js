/* eslint-env node */
'use strict';

const ESLint = require('broccoli-lint-eslint');

module.exports = function _lint(tree) {
  return new ESLint(tree, {
    testGenerator: 'qunit'
  });
}