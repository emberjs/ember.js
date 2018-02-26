'use strict';
/* eslint-env node */

const concat = require('broccoli-concat');

module.exports = function(tree, options) {
  let { outputFile, hasBootstrap, footer } = options;

  if (typeof hasBootstrap !== 'boolean') {
    hasBootstrap = true;
  }

  let footerFiles = [];

  if (hasBootstrap) {
    footerFiles = ['bootstrap']
  }

  if (!footer) {
    footer = '';
  }

  return concat(tree, {
    header: '(function() {',
    outputFile: outputFile,
    headerFiles: ['license.js', 'loader.js'],
    sourceMapConfig: { enabled: true },
    footerFiles: footerFiles,
    inputFiles: ['**/*'],
    annotation: outputFile,
    footer: footer + '\n}());'
  });
}