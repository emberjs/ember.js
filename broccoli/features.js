'use strict';
/* eslint-env node */

function getFlags(isDebug, type) {
  let features = Object.assign({}, require('../features')[type]);
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

  features['ember-glimmer-allow-backtracking-rerender'] = false;

  if (process.env.ALLOW_BACKTRACKING) {
    features['ember-glimmer-allow-backtracking-rerender'] = true;
    features['ember-glimmer-detect-backtracking-rerender'] = false;
  }

  features['mandatory-setter'] = isDebug;
  features['ember-glimmer-detect-backtracking-rerender'] = isDebug;

  return features;
}

function toConst(features) {
  let consted = {};
  Object.keys(features).forEach((feature) => {
    consted[feature.toUpperCase().replace(/(-|\.)/g, '_')] = features[feature]
  });

  return consted;
}

let RUNTIME_RELEASE_FLAGS = {};
let releaseFlags = getFlags(false, 'features');
Object.keys(releaseFlags).forEach((flag) => {

  if (releaseFlags[flag] === null) {
    RUNTIME_RELEASE_FLAGS[flag] = null;
  }
})

const DEBUG_FLAGS = getFlags(true, 'features');

module.exports.toConst = toConst;
module.exports.RELEASE = releaseFlags;
module.exports.RUNTIME_RELEASE_FLAGS = RUNTIME_RELEASE_FLAGS;
module.exports.DEBUG = DEBUG_FLAGS;
module.exports.DEPRECATIONS = Object.assign({}, require('../features')['deprecations']);
