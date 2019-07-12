'use strict';

const concat = require('broccoli-concat');

module.exports = function(
  tree,
  { outputFile, header = '', footer = '', headerFiles = [], footerFiles = [] }
) {
  return concat(tree, {
    header: '(function() {' + header,
    outputFile,
    headerFiles,
    sourceMapConfig: { enabled: true },
    footerFiles,
    inputFiles: ['**/*.js'],
    annotation: outputFile,
    footer: footer + '\n}());',
  });
};
