import { ENV } from '@ember/-internals/environment';
/**
  Set `EmberENV.FEATURES` in your application's `config/environment.js` file
  to enable canary features in your application.

  See the [feature flag guide](https://guides.emberjs.com/release/configuring-ember/feature-flags/)
  for more details.

  @module @ember/canary-features
  @public
*/
export const DEFAULT_FEATURES = {
  // FLAG_NAME: true/false
};
/**
  The hash of enabled Canary features. Add to this, any canary features
  before creating your application.

  @class FEATURES
  @static
  @since 1.1.0
  @public
*/
export const FEATURES = Object.assign(DEFAULT_FEATURES, ENV.FEATURES);
/**
  Determine whether the specified `feature` is enabled. Used by Ember's
  build tools to exclude experimental features from beta/stable builds.

  You can define the following configuration options:

  * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
    enabled/disabled.

  @method isEnabled
  @param {String} feature The feature to check
  @return {Boolean}
  @since 1.1.0
  @public
*/
export function isEnabled(feature) {
  let value = FEATURES[feature];
  if (value === true || value === false) {
    return value;
  } else if (ENV.ENABLE_OPTIONAL_FEATURES) {
    return true;
  } else {
    return false;
  }
}
// Uncomment the below when features are present:
// function featureValue(value: null | boolean) {
//   if (ENV.ENABLE_OPTIONAL_FEATURES && value === null) {
//     return true;
//   }
//   return value;
// }
// export const FLAG_NAME = featureValue(FEATURES.FLAG_NAME);