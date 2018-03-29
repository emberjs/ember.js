'use strict';

const Uglify = require('broccoli-uglify-sourcemap');

module.exports = function _minify(tree) {
  let options = {
    enabled: true,

    uglify: {
      compress: {
        // this is adversely affects heuristics for IIFE eval
        negate_iife: false,
        // limit sequences because of memory issues during parsing
        sequences: 0
      },
      mangle: {
        safari10: true
      },
      output: {
        // no difference in size and much easier to debug
        semicolons: false
      }
    }
  };

  return new Uglify(tree, options);
};
