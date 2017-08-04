'use strict';

const babel = require('broccoli-babel-transpiler');

/**
 * Transpiles a tree of ES2015+ JavaScript files to ES5 with Babel.
 */
module.exports = function transpileToES5(inputNode, modules = false) {
  return babel(inputNode, {
    annotation: 'Babel - ES5',
    sourceMaps: 'inline',
    moduleIds: true,
    presets: [
      ['env', {
        loose: true,
        modules,
        exclude: [
          'transform-es2015-typeof-symbol'
        ]
      }]
    ]
  });
}
