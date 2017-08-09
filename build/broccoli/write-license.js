'use strict';

const writeFile = require('broccoli-file-creator');
const { readFileSync } = require('fs');

const LICENSE = readFileSync('./LICENSE', 'utf8');

module.exports = function writeLicense(licensePath) {
  return writeFile(licensePath, LICENSE);
}