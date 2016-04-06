import Ember from 'ember-metal/core';
import assign from 'ember-metal/assign';

/**
  The hash of enabled Canary features. Add to this, any canary features
  before creating your application.

  Alternatively (and recommended), you can also define `EmberENV.FEATURES`
  if you need to enable features flagged at runtime.

  @class FEATURES
  @namespace Ember
  @static
  @since 1.1.0
  @public
*/
export const KNOWN_FEATURES = DEFAULT_FEATURES; // jshint ignore:line
export var FEATURES = assign(KNOWN_FEATURES, Ember.ENV.FEATURES);

/**
  Determine whether the specified `feature` is enabled. Used by Ember's
  build tools to exclude experimental features from beta/stable builds.

  You can define the following configuration options:

  * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
    enabled/disabled.

  @method isEnabled
  @param {String} feature The feature to check
  @return {Boolean}
  @for Ember.FEATURES
  @since 1.1.0
  @public
*/
export default function isEnabled(feature) {
  var featureValue = FEATURES[feature];

  if (featureValue === true || featureValue === false || featureValue === undefined) {
    return featureValue;
  } else if (Ember.ENV.ENABLE_OPTIONAL_FEATURES) {
    return true;
  } else {
    return false;
  }
}
