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

export { default as DEFAULT_FEATURES } from './default-features';

import DEFAULT_FEATURES from './default-features';

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
export const EMBER_MODULE_UNIFICATION = featureValue(FEATURES.EMBER_MODULE_UNIFICATION);
export const EMBER_METAL_TRACKED_PROPERTIES = featureValue(FEATURES.EMBER_METAL_TRACKED_PROPERTIES);
export const EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES = featureValue(
  FEATURES.EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES
);
export const EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS = featureValue(
  FEATURES.EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS
);
export const EMBER_NATIVE_DECORATOR_SUPPORT = featureValue(FEATURES.EMBER_NATIVE_DECORATOR_SUPPORT);
export const EMBER_GLIMMER_FN_HELPER = featureValue(FEATURES.EMBER_GLIMMER_FN_HELPER);
export const EMBER_CUSTOM_COMPONENT_ARG_PROXY = featureValue(
  FEATURES.EMBER_CUSTOM_COMPONENT_ARG_PROXY
);
export const EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT = featureValue(
  FEATURES.EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT
);
export const EMBER_GLIMMER_SET_COMPONENT_TEMPLATE = featureValue(
  FEATURES.EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
);
