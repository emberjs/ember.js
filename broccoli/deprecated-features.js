'use strict';

const requireEsm = require('esm')(module);

/**
 * @param name {string}
 * @param source {string}
 */
const DEPRECATED_FEATURES = (function getFeatures() {
  const { default: flags } = requireEsm(
    '../packages/@ember/deprecated-features/deprecated-features.js'
  );
  return flags;
})();

module.exports = DEPRECATED_FEATURES;
