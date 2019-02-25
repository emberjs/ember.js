'use strict';

const Babel = require('broccoli-babel-transpiler');
const FEATURES = require('./features');

module.exports = function debugMacros(tree, environment) {
  let isDebug = environment !== 'production';

  let plugins = [
    [
      'debug-macros',
      {
        debugTools: {
          source: '@ember/debug',
          assertPredicateIndex: 1,
          isDebug,
        },
        externalizeHelpers: {
          module: true,
        },
        flags: [
          { source: '@glimmer/env', flags: { DEBUG: isDebug } },
          {
            source: '@ember/canary-features',
            flags: Object.assign(
              // explicit list of additional exports within @ember/canary-features
              // without adding this (with a null value) an error is thrown during
              // the feature replacement process (e.g. XYZ is not a supported flag)
              {
                FEATURES: null,
                DEFAULT_FEATURES: null,
                isEnabled: null,
              },
              FEATURES
            ),
          },
        ],
      },
    ],
  ];

  return new Babel(tree, { plugins });
};
