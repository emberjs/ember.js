'use strict';

const FEATURES = require('./features');

module.exports = function canaryFeatures() {
  return [
    require.resolve('babel-plugin-debug-macros'),
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
  ];
};
