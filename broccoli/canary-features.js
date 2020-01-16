'use strict';

const Babel = require('broccoli-babel-transpiler');
const FEATURES = require('./features');

module.exports = function canaryFeatures(tree) {
  let plugins = [
    [
      'debug-macros',
      {
        flags: [
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
      'debug-macros:canary-flags',
    ],

    // These plugins are necessary for being able to run test code through this
    // transform, since some tests use decorators and class fields
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
  ];

  return new Babel(tree, { plugins });
};
