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
  @public
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

// The debug functions are exported to globals with `require` to
// prevent babel-plugin-filter-imports from removing them.
let debugModule = Ember.__loader.require('ember-metal/debug');
Ember.assert = debugModule.assert;
Ember.warn = debugModule.warn;
Ember.debug = debugModule.debug;
Ember.deprecate = debugModule.deprecate;
Ember.deprecateFunc = debugModule.deprecateFunc;
Ember.runInDebug = debugModule.runInDebug;

/**
  The semantic version.

  @property VERSION
  @type String
  @default 'VERSION_STRING_PLACEHOLDER'
  @static
  @public
*/
Ember.VERSION = 'VERSION_STRING_PLACEHOLDER';

/**
  The hash of environment variables used to control various configuration
  settings. To specify your own or override default settings, add the
  desired properties to a global hash named `EmberENV` (or `ENV` for
  backwards compatibility with earlier versions of Ember). The `EmberENV`
  hash must be created before loading Ember.

  @property ENV
  @type Object
  @public
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
  @public
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
  @public
*/
Ember.LOG_STACKTRACE_ON_DEPRECATION = (Ember.ENV.LOG_STACKTRACE_ON_DEPRECATION !== false);

/**
  The `SHIM_ES5` property, when true, tells Ember to add ECMAScript 5 Array
  shims to older browsers.

  @property SHIM_ES5
  @type Boolean
  @default Ember.EXTEND_PROTOTYPES
  @public
*/
Ember.SHIM_ES5 = (Ember.ENV.SHIM_ES5 === false) ? false : Ember.EXTEND_PROTOTYPES;

/**
  The `LOG_VERSION` property, when true, tells Ember to log versions of all
  dependent libraries in use.

  @property LOG_VERSION
  @type Boolean
  @default true
  @public
*/
Ember.LOG_VERSION = (Ember.ENV.LOG_VERSION === false) ? false : true;

/**
  An empty function useful for some operations. Always returns `this`.

  @method K
  @return {Object}
  @public
*/
function K() { return this; }
export { K };
Ember.K = K;
//TODO: ES6 GLOBAL TODO

export default Ember;
