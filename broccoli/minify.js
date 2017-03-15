const Funnel = require('broccoli-funnel');
const Uglify = require('broccoli-uglify-js');
const path = require('path');

module.exports = function _minify(tree, name) {
  let minified = new Uglify(tree, {
    sourceMapConfig: {
      enable: false
    },
    mangle: true,
    compress: {
      // this is adversely affects heuristics for IIFE eval
      negate_iife: false,
      // limit sequences because of memory issues during parsing
      sequences: 30
    },
    output: {
      // no difference in size
      // and much easier to debug
      semicolons: false
    }
  });

  return new Funnel(minified, {
    getDestinationPath(relativePath) {
      let ext = path.extname(relativePath);
      if (ext === '.map') {
        return `${name}.map`
      }
      return `${name}.js`;
    },
    annotation: name
  });
}