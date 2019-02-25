'use strict';

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;
const fs = require('fs');

module.exports = function(filePath, options) {
  if (!options) {
    return file(path.join(__dirname, '../fixtures', filePath));
  }

  let content = fs.readFileSync(path.join(__dirname, '../fixtures', filePath), {
    encoding: 'utf-8',
  });
  if (options.replace) {
    content = content.replace(/<%= (\w+) =%>/g, (_match, key) => options.replace[key] || '');
  }
  return content;
};
