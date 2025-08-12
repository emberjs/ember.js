import { DEBUG } from '@glimmer/env';
import global from './global';

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
export const ENV = {
  ENABLE_OPTIONAL_FEATURES: false,

  /**
    Determines whether Ember should add to `Array`
    native object prototypes, a few extra methods in order to provide a more
    friendly API.

    The behavior from setting this option to `true` was deprecated in Ember 5.10.

    @property EXTEND_PROTOTYPES
    @type Boolean
    @default true
    @for EmberENV
    @private
    @deprecated in v5.10
  */
  EXTEND_PROTOTYPES: {
    Array: false,
  },

  /**
    The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
    a full stack trace during deprecation warnings.

    @property LOG_STACKTRACE_ON_DEPRECATION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  LOG_STACKTRACE_ON_DEPRECATION: true,

  /**
    The `LOG_VERSION` property, when true, tells Ember to log versions of all
    dependent libraries in use.

    @property LOG_VERSION
    @type Boolean
    @default true
    @for EmberENV
    @public
  */
  LOG_VERSION: true,

  RAISE_ON_DEPRECATION: false,

  STRUCTURED_PROFILE: false,

  /**
    Whether to perform extra bookkeeping needed to make the `captureRenderTree`
    API work.

    This has to be set before the ember JavaScript code is evaluated. This is
    usually done by setting `window.EmberENV = { _DEBUG_RENDER_TREE: true };`
    before the "vendor" `<script>` tag in `index.html`.

    Setting the flag after Ember is already loaded will not work correctly. It
    may appear to work somewhat, but fundamentally broken.

    This is not intended to be set directly. Ember Inspector will enable the
    flag on behalf of the user as needed.

    This flag is always on in development mode.

    The flag is off by default in production mode, due to the cost associated
    with the the bookkeeping work.

    The expected flow is that Ember Inspector will ask the user to refresh the
    page after enabling the feature. It could also offer a feature where the
    user add some domains to the "always on" list. In either case, Ember
    Inspector will inject the code on the page to set the flag if needed.

    @property _DEBUG_RENDER_TREE
    @for EmberENV
    @type Boolean
    @default false
    @private
  */
  _DEBUG_RENDER_TREE: DEBUG,

  /**
   Whether to force all deprecations to be enabled. This is used internally by
   Ember to enable deprecations in tests. It is not intended to be set in
   projects.

   @property _ALL_DEPRECATIONS_ENABLED
   @for EmberENV
   @type Boolean
   @default false
   @private
   */
  _ALL_DEPRECATIONS_ENABLED: false,

  /**
   Override the version of ember-source used to determine when deprecations "break".
   This is used internally by Ember to test with deprecated features "removed".
   This is never intended to be set by projects.
   @property _OVERRIDE_DEPRECATION_VERSION
   @for EmberENV
   @type string | null
   @default null
   @private
   */
  _OVERRIDE_DEPRECATION_VERSION: null,

  /**
    Whether the app defaults to using async observers.

    This is not intended to be set directly, as the implementation may change in
    the future. Use `@ember/optional-features` instead.

    @property _DEFAULT_ASYNC_OBSERVERS
    @for EmberENV
    @type Boolean
    @default false
    @private
  */
  _DEFAULT_ASYNC_OBSERVERS: false,

  /**
    Controls the maximum number of scheduled rerenders without "settling". In general,
    applications should not need to modify this environment variable, but please
    open an issue so that we can determine if a better default value is needed.

    @property _RERENDER_LOOP_LIMIT
    @for EmberENV
    @type number
    @default 1000
    @private
   */
  _RERENDER_LOOP_LIMIT: 1000,

  EMBER_LOAD_HOOKS: {} as {
    [hook: string]: Function[];
  },

  FEATURES: {} as {
    [feature: string]: boolean;
  },
};

((
  EmberENV: Record<string, unknown> & {
    EXTEND_PROTOTYPES?: boolean;
    EMBER_LOAD_HOOKS?: Record<string, unknown>;
    FEATURES?: Record<string, unknown>;
  }
) => {
  if (typeof EmberENV !== 'object' || EmberENV === null) return;

  for (let flag in EmberENV) {
    if (
      !Object.prototype.hasOwnProperty.call(EmberENV, flag) ||
      flag === 'EXTEND_PROTOTYPES' ||
      flag === 'EMBER_LOAD_HOOKS'
    )
      continue;
    let defaultValue = (ENV as Record<string, unknown>)[flag];
    if (defaultValue === true) {
      (ENV as Record<string, unknown>)[flag] = EmberENV[flag] !== false;
    } else if (defaultValue === false) {
      (ENV as Record<string, unknown>)[flag] = EmberENV[flag] === true;
    } else {
      (ENV as Record<string, unknown>)[flag] = EmberENV[flag];
    }
  }

  // TODO this does not seem to be used by anything,
  //      can we remove it? do we need to deprecate it?
  let { EMBER_LOAD_HOOKS } = EmberENV;
  if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
    for (let hookName in EMBER_LOAD_HOOKS) {
      if (!Object.prototype.hasOwnProperty.call(EMBER_LOAD_HOOKS, hookName)) continue;
      let hooks = EMBER_LOAD_HOOKS[hookName];
      if (Array.isArray(hooks)) {
        ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter((hook) => typeof hook === 'function');
      }
    }
  }
  let { FEATURES } = EmberENV;
  if (typeof FEATURES === 'object' && FEATURES !== null) {
    for (let feature in FEATURES) {
      if (!Object.prototype.hasOwnProperty.call(FEATURES, feature)) continue;
      ENV.FEATURES[feature] = FEATURES[feature] === true;
    }
  }

  if (DEBUG) {
    ENV._DEBUG_RENDER_TREE = true;
  }
})(global.EmberENV);

export function getENV(): object {
  return ENV;
}
