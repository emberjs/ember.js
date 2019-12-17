'use strict';

const babel = require('broccoli-babel-transpiler');
const debugMacros = require('babel-plugin-debug-macros').default;

const PRODUCTION = process.env.EMBER_ENV === 'production';

/**
 * Transpiles a tree of ES2015+ JavaScript files to ES5 with Babel.
 */
module.exports = function transpileToES5(inputNode, modules = false) {
  let plugins = [
    // Required for tests to pass in IE <=10, which rely on inheritance of
    // static class methods. This doesn't work in IE 10 and below so we
    // statically copy properties off __proto__ at class definition time.
    'transform-proto-to-assign',
  ];

  if (!PRODUCTION) {
    // Compile out @glimmer/env for tests
    plugins.push([
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
    ]);
  }

  return babel(inputNode, {
    annotation: 'Babel - ES5',
    sourceMaps: 'inline',
    moduleIds: true,
    presets: [
      [
        'env',
        {
          loose: true,
          modules,
          exclude: [
            // Transforms all `typeof` checks to account for Symbol, which we don't
            // rely on, so can safely skip.
            'transform-es2015-typeof-symbol',
          ],
        },
      ],
    ],
    plugins,
  });
};
