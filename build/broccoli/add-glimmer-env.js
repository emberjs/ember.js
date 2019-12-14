'use strict';

const babel = require('broccoli-babel-transpiler');
const debugMacros = require('babel-plugin-debug-macros').default;

/**
 * Transpiles a tree of ES2015+ JavaScript files to ES5 with Babel.
 */
module.exports = function transpileToES5(inputNode, modules = false) {
  return babel(inputNode, {
    plugins: [
      [
        debugMacros,
        {
          envFlags: {
            source: '@glimmer/env',
            flags: {
              DEBUG: true,
            },
          },
          debugTools: {
            // Need to upgrade the plugin debug macro
            source: '@glimmer/dummy-util-not-a-real-thing',
          },
        },
      ],
    ],
  });
};
