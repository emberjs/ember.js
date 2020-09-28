import { ENV } from '@ember/-internals/environment';
import { assign } from '@ember/polyfills';

/**
  Set `EmberENV.FEATURES` in your application's `config/environment.js` file
  to enable canary features in your application.

  See the [feature flag guide](https://guides.emberjs.com/release/configuring-ember/feature-flags/)
  for more details.

  @module @ember/canary-features
  @public
*/

export const DEFAULT_FEATURES = {
  EMBER_LIBRARIES_ISREGISTERED: null,
  EMBER_IMPROVED_INSTRUMENTATION: null,
  EMBER_NAMED_BLOCKS: null,
  EMBER_GLIMMER_SET_COMPONENT_TEMPLATE: true,
  EMBER_ROUTING_MODEL_ARG: true,
  EMBER_GLIMMER_IN_ELEMENT: true,
  EMBER_CACHE_API: true,
  EMBER_DESTROYABLES: true,
  EMBER_GLIMMER_HELPER_MANAGER: null,
  EMBER_GLIMMER_INVOKE_HELPER: null,
};

/**
  The hash of enabled Canary features. Add to this, any canary features
  before creating your application.

  @class FEATURES
  @static
  @since 1.1.0
  @public
*/
export const FEATURES = assign(DEFAULT_FEATURES, ENV.FEATURES);

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
export function isEnabled(feature: string): boolean {
  let featureValue = FEATURES[feature];

  if (featureValue === true || featureValue === false) {
    return featureValue;
  } else if (ENV.ENABLE_OPTIONAL_FEATURES) {
    return true;
  } else {
    return false;
  }
}

function featureValue(value: null | boolean) {
  if (ENV.ENABLE_OPTIONAL_FEATURES && value === null) {
    return true;
  }

  return value;
}

export const EMBER_LIBRARIES_ISREGISTERED = featureValue(FEATURES.EMBER_LIBRARIES_ISREGISTERED);
export const EMBER_IMPROVED_INSTRUMENTATION = featureValue(FEATURES.EMBER_IMPROVED_INSTRUMENTATION);
export const EMBER_NAMED_BLOCKS = featureValue(FEATURES.EMBER_NAMED_BLOCKS);
export const EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = featureValue(
  FEATURES.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
);
export const EMBER_ROUTING_MODEL_ARG = featureValue(FEATURES.EMBER_ROUTING_MODEL_ARG);
export const EMBER_GLIMMER_IN_ELEMENT = featureValue(FEATURES.EMBER_GLIMMER_IN_ELEMENT);
export const EMBER_CACHE_API = featureValue(FEATURES.EMBER_CACHE_API);
export const EMBER_DESTROYABLES = featureValue(FEATURES.EMBER_DESTROYABLES);
export const EMBER_GLIMMER_HELPER_MANAGER = featureValue(FEATURES.EMBER_GLIMMER_HELPER_MANAGER);
export const EMBER_GLIMMER_INVOKE_HELPER = featureValue(FEATURES.EMBER_GLIMMER_INVOKE_HELPER);
