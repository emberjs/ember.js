'use strict';

const concat = require('broccoli-concat');

module.exports = function concatBundle(
  tree,
  { outputFile, header = '', footer = '', headerFiles = [], footerFiles = [] }
) {
  return concat(tree, {
    header: '(function() {' + header,
    outputFile,
    headerFiles: ['license.js', 'loader.js'].concat(headerFiles),
    sourceMapConfig: { enabled: true },
    footerFiles,
    inputFiles: ['**/*.js'],
    annotation: outputFile,
    footer: footer + '\n}());',
  });
};
