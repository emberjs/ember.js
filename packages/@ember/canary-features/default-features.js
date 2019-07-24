/*
  This list of features is used both at build time (by `broccoli/features.js`)
  and at runtime (by `@ember/canary-features`).

  The valid values are:

  - true - The feature is enabled at all times, and cannot be disabled.
  - false - The feature is disabled at all times, and cannot be enabled.
  - null - The feature is disabled by default, but can be enabled at runtime via `EmberENV`.
*/
export default {
  EMBER_LIBRARIES_ISREGISTERED: null,
  EMBER_IMPROVED_INSTRUMENTATION: null,
  EMBER_MODULE_UNIFICATION: false,
  EMBER_METAL_TRACKED_PROPERTIES: true,
  EMBER_GLIMMER_FORWARD_MODIFIERS_WITH_SPLATTRIBUTES: true,
  EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS: true,
  EMBER_NATIVE_DECORATOR_SUPPORT: true,
  EMBER_GLIMMER_FN_HELPER: true,
  EMBER_CUSTOM_COMPONENT_ARG_PROXY: true,
  EMBER_FRAMEWORK_OBJECT_OWNER_ARGUMENT: true,
  EMBER_GLIMMER_SET_COMPONENT_TEMPLATE: null,
};
