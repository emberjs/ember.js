'use strict';

const { readFileSync } = require('fs');
const writeFile = require('broccoli-file-creator');

const LICENSE = readFileSync('./LICENSE', 'utf8');

module.exports = function writeLicense(licensePath) {
  return writeFile(licensePath, LICENSE);
};
