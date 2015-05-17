/*globals Ember:true,ENV,EmberENV */

/**
@module ember
@submodule ember-metal
*/

/**
  This namespace contains all Ember methods and functions. Future versions of
  Ember may overwrite this namespace and therefore, you should avoid adding any
  new properties.

  You can also use the shorthand `Em` instead of `Ember`.

  At the heart of Ember is Ember-Runtime, a set of core functions that provide
  cross-platform compatibility and object property observing.  Ember-Runtime is
  small and performance-focused so you can use it alongside other
  cross-platform libraries such as jQuery. For more details, see
  [Ember-Runtime](http://emberjs.com/api/modules/ember-runtime.html).

  @class Ember
  @static
  @version VERSION_STRING_PLACEHOLDER
*/

if ('undefined' === typeof Ember) {
  // Create core object. Make it act like an instance of Ember.Namespace so that
  // objects assigned to it are given a sane string representation.
  Ember = {};
}

// Default imports, exports and lookup to the global object;
var global = mainContext || {}; // jshint ignore:line
Ember.imports = Ember.imports || global;
Ember.lookup  = Ember.lookup  || global;
var emExports   = Ember.exports = Ember.exports || global;

// aliases needed to keep minifiers from removing the global context
emExports.Em = emExports.Ember = Ember;

// Make sure these are set whether Ember was already defined or not

Ember.isNamespace = true;

Ember.toString = function() { return 'Ember'; };


/**
  The semantic version.

  @property VERSION
  @type String
  @default 'VERSION_STRING_PLACEHOLDER'
  @static
*/
Ember.VERSION = 'VERSION_STRING_PLACEHOLDER';

/**
  The hash of environment variables used to control various configuration
  settings. To specify your own or override default settings, add the
  desired properties to a global hash named `EmberENV` (or `ENV` for
  backwards compatibility with earlier versions of Ember). The `EmberENV`
  hash must be created before loading Ember.

  @property ENV
  @type Hash
*/

if (Ember.ENV) {
  // do nothing if Ember.ENV is already setup
  Ember.assert('Ember.ENV should be an object.', 'object' !== typeof Ember.ENV);
} else if ('undefined' !== typeof EmberENV) {
  Ember.ENV = EmberENV;
} else if ('undefined' !== typeof ENV) {
  Ember.ENV = ENV;
} else {
  Ember.ENV = {};
}

Ember.config = Ember.config || {};

// We disable the RANGE API by default for performance reasons
if ('undefined' === typeof Ember.ENV.DISABLE_RANGE_API) {
  Ember.ENV.DISABLE_RANGE_API = true;
}

/**
  The hash of enabled Canary features. Add to this, any canary features
  before creating your application.

  Alternatively (and recommended), you can also define `EmberENV.FEATURES`
  if you need to enable features flagged at runtime.

  @class FEATURES
  @namespace Ember
  @static
  @since 1.1.0
*/
Ember.FEATURES = DEFAULT_FEATURES; //jshint ignore:line

if (Ember.ENV.FEATURES) {
  for (var feature in Ember.ENV.FEATURES) {
    if (Ember.ENV.FEATURES.hasOwnProperty(feature)) {
      Ember.FEATURES[feature] = Ember.ENV.FEATURES[feature];
    }
  }
}

/**
  Determine whether the specified `feature` is enabled. Used by Ember's
  build tools to exclude experimental features from beta/stable builds.

  You can define the following configuration options:

  * `EmberENV.ENABLE_ALL_FEATURES` - force all features to be enabled.
  * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
    enabled/disabled.

  @method isEnabled
  @param {String} feature The feature to check
  @return {Boolean}
  @for Ember.FEATURES
  @since 1.1.0
*/

Ember.FEATURES.isEnabled = function(feature) {
  var featureValue = Ember.FEATURES[feature];

  if (Ember.ENV.ENABLE_ALL_FEATURES) {
    return true;
  } else if (featureValue === true || featureValue === false || featureValue === undefined) {
    return featureValue;
  } else if (Ember.ENV.ENABLE_OPTIONAL_FEATURES) {
    return true;
  } else {
    return false;
  }
};

// ..........................................................
// BOOTSTRAP
//

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
  @for Ember
*/
Ember.EXTEND_PROTOTYPES = Ember.ENV.EXTEND_PROTOTYPES;

if (typeof Ember.EXTEND_PROTOTYPES === 'undefined') {
  Ember.EXTEND_PROTOTYPES = true;
}

/**
  The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
  a full stack trace during deprecation warnings.

  @property LOG_STACKTRACE_ON_DEPRECATION
  @type Boolean
  @default true
*/
Ember.LOG_STACKTRACE_ON_DEPRECATION = (Ember.ENV.LOG_STACKTRACE_ON_DEPRECATION !== false);

/**
  The `SHIM_ES5` property, when true, tells Ember to add ECMAScript 5 Array
  shims to older browsers.

  @property SHIM_ES5
  @type Boolean
  @default Ember.EXTEND_PROTOTYPES
*/
Ember.SHIM_ES5 = (Ember.ENV.SHIM_ES5 === false) ? false : Ember.EXTEND_PROTOTYPES;

/**
  The `LOG_VERSION` property, when true, tells Ember to log versions of all
  dependent libraries in use.

  @property LOG_VERSION
  @type Boolean
  @default true
*/
Ember.LOG_VERSION = (Ember.ENV.LOG_VERSION === false) ? false : true;

/**
  An empty function useful for some operations. Always returns `this`.

  @method K
  @private
  @return {Object}
*/
function K() { return this; }
export { K };
Ember.K = K;
//TODO: ES6 GLOBAL TODO

// Stub out the methods defined by the ember-debug package in case it's not loaded

if ('undefined' === typeof Ember.assert) { Ember.assert = K; }
if ('undefined' === typeof Ember.warn) { Ember.warn = K; }
if ('undefined' === typeof Ember.debug) { Ember.debug = K; }
if ('undefined' === typeof Ember.runInDebug) { Ember.runInDebug = K; }
if ('undefined' === typeof Ember.deprecate) { Ember.deprecate = K; }
if ('undefined' === typeof Ember.deprecateFunc) {
  Ember.deprecateFunc = function(_, func) { return func; };
}

export default Ember;
