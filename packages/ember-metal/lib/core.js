/*globals Ember:true,ENV,EmberENV */

/**
@module ember
@submodule ember-metal
*/

/**
  All Ember methods and functions are defined inside of this namespace. You
  generally should not add new properties to this namespace as it may be
  overwritten by future versions of Ember.

  You can also use the shorthand `Em` instead of `Ember`.

  Ember-Runtime is a framework that provides core functions for Ember including
  cross-platform functions, support for property observing and objects. Its
  focus is on small size and performance. You can use this in place of or
  along-side other cross-platform libraries such as jQuery.

  The core Runtime framework is based on the jQuery API with a number of
  performance optimizations.

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
  @property VERSION
  @type String
  @default 'VERSION_STRING_PLACEHOLDER'
  @static
*/
Ember.VERSION = 'VERSION_STRING_PLACEHOLDER';

/**
  Standard environmental variables. You can define these in a global `EmberENV`
  variable before loading Ember to control various configuration settings.

  For backwards compatibility with earlier versions of Ember the global `ENV`
  variable will be used if `EmberENV` is not defined.

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
  Hash of enabled Canary features. Add to this before creating your application.

  You can also define `EmberENV.FEATURES` if you need to enable features flagged at runtime.

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
  Test that a feature is enabled. Parsed by Ember's build tools to leave
  experimental features out of beta/stable builds.

  You can define the following configuration options:

  * `EmberENV.ENABLE_ALL_FEATURES` - force all features to be enabled.
  * `EmberENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
    enabled/disabled.

  @method isEnabled
  @param {String} feature
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
  Determines whether Ember should enhance some built-in object prototypes to
  provide a more friendly API. If enabled, a few methods will be added to
  `Function`, `String`, and `Array`. `Object.prototype` will not be enhanced,
  which is the one that causes most trouble for people.

  In general we recommend leaving this option set to true since it rarely
  conflicts with other code. If you need to turn it off however, you can
  define an `EmberENV.EXTEND_PROTOTYPES` config to disable it.

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
  Determines whether Ember logs a full stack trace during deprecation warnings

  @property LOG_STACKTRACE_ON_DEPRECATION
  @type Boolean
  @default true
*/
Ember.LOG_STACKTRACE_ON_DEPRECATION = (Ember.ENV.LOG_STACKTRACE_ON_DEPRECATION !== false);

/**
  Determines whether Ember should add ECMAScript 5 Array shims to older browsers.

  @property SHIM_ES5
  @type Boolean
  @default Ember.EXTEND_PROTOTYPES
*/
Ember.SHIM_ES5 = (Ember.ENV.SHIM_ES5 === false) ? false : Ember.EXTEND_PROTOTYPES;

/**
  Determines whether Ember logs info about version of used libraries

  @property LOG_VERSION
  @type Boolean
  @default true
*/
Ember.LOG_VERSION = (Ember.ENV.LOG_VERSION === false) ? false : true;

/**
  Empty function. Useful for some operations. Always returns `this`.

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
