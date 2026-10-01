'use strict';

const FEATURES = require('./features.cjs');

module.exports = function canaryFeatures() {
  return [
    require.resolve('babel-plugin-debug-macros'),
    {
      flags: [
        {
          source: '@ember/canary-features',
          flags: Object.assign(
            // Each additional export of @ember/canary-features
            // must be listed here with a null value.
            // Without it, the feature replacement process throws an error,
            // for example "XYZ is not a supported flag".
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
