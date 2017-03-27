'use strict';
/* eslint-env node */

const concat = require('broccoli-concat');

module.exports = function(tree, options) {
  let { outputFile, hasBootstrap } = options;

  if (typeof hasBootstrap !== 'boolean') {
    hasBootstrap = true;
  }

  let footerFiles = [];

  if (hasBootstrap) {
    footerFiles = ['bootstrap']
  }

  return concat(tree, {
    header: '(function() {',
    outputFile: outputFile,
    headerFiles: ['license.js', 'loader.js'],
    footerFiles: footerFiles,
    inputFiles: ['**/*'],
    annotation: outputFile,
    footer: '}());'
  });
}