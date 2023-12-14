import { DEBUG } from '@glimmer/env';

// from lodash to catch fake globals
function checkGlobal(value) {
  return value && value.Object === Object ? value : undefined;
}
// element ids can ruin global miss checks
function checkElementIdShadowing(value) {
  return value && value.nodeType === undefined ? value : undefined;
}
// export real global
var global$1 = checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || typeof mainContext !== 'undefined' && mainContext ||
// set before strict mode in Ember loader/wrapper
new Function('return this')(); // eval outside of strict mode

// legacy imports/exports/lookup stuff (should we keep this??)
const context = function (global, Ember) {
  return Ember === undefined ? {
    imports: global,
    exports: global,
    lookup: global
  } : {
    // import jQuery
    imports: Ember.imports || global,
    // export Ember
    exports: Ember.exports || global,
    // search for Namespaces
    lookup: Ember.lookup || global
  };
}(global$1, global$1.Ember);
function getLookup() {
  return context.lookup;
}
function setLookup(value) {
  context.lookup = value;
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
const ENV = {
  ENABLE_OPTIONAL_FEATURES: false,
  /**
    Determines whether Ember should add to `Array`
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
  EXTEND_PROTOTYPES: {
    Array: true
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
  _APPLICATION_TEMPLATE_WRAPPER: true,
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
  _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,
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
  EMBER_LOAD_HOOKS: {},
  FEATURES: {}
};
(EmberENV => {
  if (typeof EmberENV !== 'object' || EmberENV === null) return;
  for (let flag in EmberENV) {
    if (!Object.prototype.hasOwnProperty.call(EmberENV, flag) || flag === 'EXTEND_PROTOTYPES' || flag === 'EMBER_LOAD_HOOKS') continue;
    let defaultValue = ENV[flag];
    if (defaultValue === true) {
      ENV[flag] = EmberENV[flag] !== false;
    } else if (defaultValue === false) {
      ENV[flag] = EmberENV[flag] === true;
    }
  }
  let {
    EXTEND_PROTOTYPES
  } = EmberENV;
  if (EXTEND_PROTOTYPES !== undefined) {
    if (typeof EXTEND_PROTOTYPES === 'object' && EXTEND_PROTOTYPES !== null) {
      ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES.Array !== false;
    } else {
      ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES !== false;
    }
  }
  // TODO this does not seem to be used by anything,
  //      can we remove it? do we need to deprecate it?
  let {
    EMBER_LOAD_HOOKS
  } = EmberENV;
  if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
    for (let hookName in EMBER_LOAD_HOOKS) {
      if (!Object.prototype.hasOwnProperty.call(EMBER_LOAD_HOOKS, hookName)) continue;
      let hooks = EMBER_LOAD_HOOKS[hookName];
      if (Array.isArray(hooks)) {
        ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter(hook => typeof hook === 'function');
      }
    }
  }
  let {
    FEATURES
  } = EmberENV;
  if (typeof FEATURES === 'object' && FEATURES !== null) {
    for (let feature in FEATURES) {
      if (!Object.prototype.hasOwnProperty.call(FEATURES, feature)) continue;
      ENV.FEATURES[feature] = FEATURES[feature] === true;
    }
  }
  if (DEBUG) {
    ENV._DEBUG_RENDER_TREE = true;
  }
})(global$1.EmberENV);
function getENV() {
  return ENV;
}

export { ENV, context, getENV, getLookup, global$1 as global, setLookup };
