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
  EMBER_GLIMMER_NAMED_ARGUMENTS: true,
  EMBER_ROUTING_ROUTER_SERVICE: true,
  EMBER_ENGINES_MOUNT_PARAMS: true,
  EMBER_MODULE_UNIFICATION: null,
  GLIMMER_CUSTOM_COMPONENT_MANAGER: true,
  GLIMMER_MODIFIER_MANAGER: null,
  EMBER_METAL_TRACKED_PROPERTIES: null,
  EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION: true,
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
export const EMBER_GLIMMER_NAMED_ARGUMENTS = featureValue(FEATURES.EMBER_GLIMMER_NAMED_ARGUMENTS);
export const EMBER_ROUTING_ROUTER_SERVICE = featureValue(FEATURES.EMBER_ROUTING_ROUTER_SERVICE);
export const EMBER_ENGINES_MOUNT_PARAMS = featureValue(FEATURES.EMBER_ENGINES_MOUNT_PARAMS);
export const EMBER_MODULE_UNIFICATION = featureValue(FEATURES.EMBER_MODULE_UNIFICATION);
export const EMBER_METAL_TRACKED_PROPERTIES = featureValue(FEATURES.EMBER_METAL_TRACKED_PROPERTIES);
export const GLIMMER_CUSTOM_COMPONENT_MANAGER = featureValue(
  FEATURES.GLIMMER_CUSTOM_COMPONENT_MANAGER
);
export const EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION = featureValue(
  FEATURES.EMBER_GLIMMER_ANGLE_BRACKET_INVOCATION
);
export const GLIMMER_MODIFIER_MANAGER = featureValue(FEATURES.GLIMMER_MODIFIER_MANAGER);
