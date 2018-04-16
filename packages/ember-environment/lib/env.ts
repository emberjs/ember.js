import global from './global';
import { defaultFalse, defaultTrue, normalizeExtendPrototypes } from './utils';

export interface Environment {
  ENABLE_ALL_FEATURES: boolean;
  ENABLE_OPTIONAL_FEATURES: boolean;
  EXTEND_PROTOTYPES: {
    Array: boolean;
    Function: boolean;
    String: boolean;
  };
  LOG_STACKTRACE_ON_DEPRECATION: boolean;
  LOG_VERSION: boolean;
  RAISE_ON_DEPRECATION: boolean;
  _APPLICATION_TEMPLATE_WRAPPER: boolean;
  _TEMPLATE_ONLY_GLIMMER_COMPONENTS: boolean;
  _ENABLE_EMBER_K_SUPPORT: boolean;
  _ENABLE_SAFE_STRING_SUPPORT: boolean;
  _ENABLE_ENUMERABLE_CONTAINS_SUPPORT: boolean;
  _ENABLE_UNDERSCORE_ACTIONS_SUPPORT: boolean;
  _ENABLE_REVERSED_OBSERVER_SUPPORT: boolean;
  _ENABLE_INITIALIZER_ARGUMENTS_SUPPORT: boolean;
  _ENABLE_ROUTER_RESOURCE: boolean;
  _ENABLE_CURRENT_WHEN_SUPPORT: boolean;
  _ENABLE_CONTROLLER_WRAPPED_SUPPORT: boolean;
  _ENABLE_DEPRECATED_REGISTRY_SUPPORT: boolean;
  _ENABLE_IMMEDIATE_OBSERVER_SUPPORT: boolean;
  _ENABLE_STRING_FMT_SUPPORT: boolean;
  _ENABLE_FREEZABLE_SUPPORT: boolean;
  _ENABLE_COMPONENT_DEFAULTLAYOUT_SUPPORT: boolean;
  _ENABLE_BINDING_SUPPORT: boolean;
  _ENABLE_INPUT_TRANSFORM_SUPPORT: boolean;
  _ENABLE_DEPRECATION_OPTIONS_SUPPORT: boolean;
  _ENABLE_ORPHANED_OUTLETS_SUPPORT: boolean;
  _ENABLE_WARN_OPTIONS_SUPPORT: boolean;
  _ENABLE_RESOLVER_FUNCTION_SUPPORT: boolean;
  _ENABLE_DID_INIT_ATTRS_SUPPORT: boolean;
  _ENABLE_RENDER_SUPPORT: boolean;
  _ENABLE_PROPERTY_REQUIRED_SUPPORT: boolean;
}

/**
  The hash of environment variables used to control various configuration
  settings. To specify your own or override default settings, add the
  desired properties to a global hash named `EmberENV` (or `ENV` for
  backwards compatibility with earlier versions of Ember). The `EmberENV`
  hash must be created before loading Ember.

  @class EmberENV
  @type Object
  @public
*/
export const ENV: Environment =
  (typeof global.EmberENV === 'object' && global.EmberENV) ||
  (typeof global.ENV === 'object' && global.ENV) ||
  {};

export function getENV() {
  return ENV;
}

// ENABLE_ALL_FEATURES was documented, but you can't actually enable non optional features.
if (ENV.ENABLE_ALL_FEATURES) {
  ENV.ENABLE_OPTIONAL_FEATURES = true;
}

/**
  Determines whether Ember should add to `Array`, `Function`, and `String`
  native object prototypes, a few extra methods in order to provide a more
  friendly API.

  We generally recommend leaving this option set to true however, if you need
  to turn it off, you can add the configuration property
  `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.

  Note, when disabled (the default configuration for Ember Addons), you will
  instead have to access all methods and functions from the Ember
  namespace.

  @property EXTEND_PROTOTYPES
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.EXTEND_PROTOTYPES = normalizeExtendPrototypes(ENV.EXTEND_PROTOTYPES);

/**
  The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
  a full stack trace during deprecation warnings.

  @property LOG_STACKTRACE_ON_DEPRECATION
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.LOG_STACKTRACE_ON_DEPRECATION = defaultTrue(ENV.LOG_STACKTRACE_ON_DEPRECATION);

/**
  The `LOG_VERSION` property, when true, tells Ember to log versions of all
  dependent libraries in use.

  @property LOG_VERSION
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.LOG_VERSION = defaultTrue(ENV.LOG_VERSION);

ENV.RAISE_ON_DEPRECATION = defaultFalse(ENV.RAISE_ON_DEPRECATION);

/**
  Whether to insert a `<div class="ember-view" />` wrapper around the
  application template. See RFC #280.

  This is not intended to be set directly, as the implementation may change in
  the future. Use `@ember/optional-features` instead.

  @property _APPLICATION_TEMPLATE_WRAPPER
  @for EmberENV
  @type Boolean
  @default true
  @private
*/
ENV._APPLICATION_TEMPLATE_WRAPPER = defaultTrue(ENV._APPLICATION_TEMPLATE_WRAPPER);

/**
  Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
  components semantics) for template-only components. See RFC #278.

  This is not intended to be set directly, as the implementation may change in
  the future. Use `@ember/optional-features` instead.

  @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
  @for EmberENV
  @type Boolean
  @default false
  @private
*/
ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = defaultFalse(ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS);
