'use strict';

const requireEsm = require('esm')(module);
function getFeatures() {
  const { default: features } = requireEsm(
    '../packages/@ember/canary-features/default-features.js'
  );

  let featureName;
  if (process.env.BUILD_TYPE === 'alpha') {
    for (featureName in features) {
      if (features[featureName] === null) {
        features[featureName] = false;
      }
    }
  }

  if (process.env.OVERRIDE_FEATURES) {
    var forcedFeatures = process.env.OVERRIDE_FEATURES.split(',');
    for (var i = 0; i < forcedFeatures.length; i++) {
      featureName = forcedFeatures[i];

      features[featureName] = true;
    }
  }

  return features;
}

module.exports = getFeatures();
