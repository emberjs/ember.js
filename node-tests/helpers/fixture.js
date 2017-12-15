'use strict';

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

module.exports = function(filePath) {
  return file(path.join(__dirname, '../fixtures', filePath));
};
