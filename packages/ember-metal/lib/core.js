/*globals Em:true ENV EmberENV MetamorphENV:true */

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
var imports = Ember.imports = Ember.imports || this;
var exports = Ember.exports = Ember.exports || this;
var lookup  = Ember.lookup  = Ember.lookup  || this;

// aliases needed to keep minifiers from removing the global context
exports.Em = exports.Ember = Em = Ember;

// Make sure these are set whether Ember was already defined or not

Ember.isNamespace = true;

Ember.toString = function() { return "Ember"; };


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

// This needs to be kept in sync with the logic in
// `packages/ember-debug/lib/main.js`.
if (Ember.ENV) {
  // do nothing if Ember.ENV is already setup
} else if ('undefined' !== typeof EmberENV) {
  Ember.ENV = EmberENV;
} else if('undefined' !== typeof ENV) {
  Ember.ENV = ENV;
} else {
  Ember.ENV = {};
}

Ember.config = Ember.config || {};

// We disable the RANGE API by default for performance reasons
if ('undefined' === typeof Ember.ENV.DISABLE_RANGE_API) {
  Ember.ENV.DISABLE_RANGE_API = true;
}

if ("undefined" === typeof MetamorphENV) {
  exports.MetamorphENV = {};
}

MetamorphENV.DISABLE_RANGE_API = Ember.ENV.DISABLE_RANGE_API;

/**
  Hash of enabled Canary features. Add to before creating your application.

  You can also define `ENV.FEATURES` if you need to enable features flagged at runtime.

  @property FEATURES
  @type Hash
*/

Ember.FEATURES = Ember.ENV.FEATURES || {};

/**
  Test that a feature is enabled. Parsed by Ember's build tools to leave
  experimental features out of beta/stable builds.

  You can define the following configuration options:

  * `ENV.ENABLE_ALL_FEATURES` - force all features to be enabled.
  * `ENV.ENABLE_OPTIONAL_FEATURES` - enable any features that have not been explicitly
    enabled/disabled.

  @method isEnabled
  @param {string} feature
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
  Determines whether Ember should enhances some built-in object prototypes to
  provide a more friendly API. If enabled, a few methods will be added to
  `Function`, `String`, and `Array`. `Object.prototype` will not be enhanced,
  which is the one that causes most trouble for people.

  In general we recommend leaving this option set to true since it rarely
  conflicts with other code. If you need to turn it off however, you can
  define an `ENV.EXTEND_PROTOTYPES` config to disable it.

  @property EXTEND_PROTOTYPES
  @type Boolean
  @default true
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
  Determines whether Ember should add ECMAScript 5 shims to older browsers.

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
Ember.K = function() { return this; };


// Stub out the methods defined by the ember-debug package in case it's not loaded

if ('undefined' === typeof Ember.assert) { Ember.assert = Ember.K; }
if ('undefined' === typeof Ember.warn) { Ember.warn = Ember.K; }
if ('undefined' === typeof Ember.debug) { Ember.debug = Ember.K; }
if ('undefined' === typeof Ember.deprecate) { Ember.deprecate = Ember.K; }
if ('undefined' === typeof Ember.deprecateFunc) {
  Ember.deprecateFunc = function(_, func) { return func; };
}

/**
  Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
  jQuery master. We'll just bootstrap our own uuid now.

  @property uuid
  @type Number
  @private
*/
Ember.uuid = 0;

//Ember.merge and Ember.mergeIf implementation
//Note that this function accepts updates passed as array
var a_concat = Array.prototype.concat;
var a_slice = Array.prototype.slice;
var merge  = function (original, source, deep, replace) {
  if (Ember.isNone(source)) {
    return original;
  }

  var idx, prop, old, oldDefined, newVal;
  if (Ember.isArray(source)) {
    for (idx = 0; idx < source.length; idx++) {
      original = merge.call(this, original, source[idx], deep, replace);
    }
  } else {
    for (prop in source) {
      newVal = source[prop];
      old = original[prop];
      oldDefined = !Ember.isNone(old);
      if (!source.hasOwnProperty(prop) || (oldDefined && Ember.isEmpty(newVal) && !replace)) { continue; }
      if (deep && oldDefined && Ember.typeOf(newVal) === 'object')  {
        newVal = merge.call(this, old, newVal, deep, replace);
      }
      original[prop] = newVal;
    }
  }
  return original;
};

//prepare arguments of Ember.merge and Ember.mergeIf as the merge function expects them
var genMergeArgs = function (args, replace) {
  args = a_slice.call(args);
  var updates,
      deep = false,
      original = args.shift();
  replace = ('boolean' === typeof replace) ? replace : true;
  if ('boolean' === typeof original) {
    deep = original;
    original = args.shift();
  }
  updates = a_concat.apply([ args.shift() ], args);
  return [original, updates, deep, replace];
};

/**
  Merge the contents of two or more objects together into the first object. this function accepts also arrays of objects.

  ```javascript
  Ember.merge({first: 'Tom'}, {last: 'Dale'}); // {first: 'Tom', last: 'Dale'}
  var a = {first: 'Yehuda'}, b = {last: 'Katz'}, c = {nickname: 'wycats'}, d = {friend: 'Tom Dale'};
  Ember.merge(a, [c, d], b); // c, d and b merged in to a == {first: 'Yehuda', last: 'Katz', nickname: 'wycats', friend: 'Tom Dale'}
  ```

  the last line is equivalent to:

  ```javascript
  var a = {first: 'Yehuda'}, b = {last: 'Katz'}, c = {nickname: 'wycats'}, d = {friend: 'Tom Dale'};
  Ember.merge(a, c); // c merged in to a == {first: 'Yehuda', last: 'Katz'}
  Ember.merge(a, d); // d merged in to a == {first: 'Yehuda', last: 'Katz', nickname: 'wycats'}
  Ember.merge(a, b); // b merged in to a == {first: 'Yehuda', last: 'Katz', nickname: 'wycats', friend: 'Tom Dale'}
  ```

  A deep merge is possible by passing `true` as the first parameter, that means that all nested objects will be merged rather then overriding them.

  ```javascript
  var a = {projectName: 'Emberjs', features: {binding: true}}, b = {features: {computedProperties: true}};
  Ember.merge(true, a, b); // a = {projectName: 'Emberjs', features: {binding: true, computedProperties: true}}
  Ember.merge(a, b); // a = {projectName: 'Emberjs', features: {computedProperties: true}}
  ```

  @method merge
  @for Ember
  @param {Boolean} [deep=false] deep merge
  @param {Object} dest Target object
  @param {Object/Array} [source]* Source objects to copy properties from
  @return {Object}
*/
Ember.merge = function() {
  //replace is by default true
  var args = genMergeArgs.call(this, arguments);
  return merge.apply(this, args);
};

/**
  Similar to `Ember.merge` except that it ignores empty properties from source objects. Keys values are tested using `Ember.isEmpty`
  to determine if they can be applied or not.

  ```javascript
  Ember.mergeIf({first: 'Tom'}, {first : '', last: 'Dale'}); // {first: 'Tom', last: 'Dale'}
  ```

  This is useful to keep your default values in first object if they are not defined in the merged objects.

  ```javascript
  Ember.merge({defaultName: 'Cat'}, {defaultName : ''); // {defaultName: ''}
  Ember.mergeIf({defaultName: 'Cat'}, {defaultName : ''); // {defaultName: 'Cat'}
  ```

  @method mergeIf
  @param {Boolean} [deep=false] deep merge
  @param {Object} dest Target object
  @param {Object/Array} [source]* Source objects to copy properties from
  @return {Object}
*/
Ember.mergeIf = function() {
  //same as merge except that it sets replace to false
  var args = genMergeArgs.call(this, arguments, false);
  return merge.apply(this, args);
};

/**
  A faster version of `Ember.merge` that accepts only two objects and does not allow deep merge.

  @method fastMerge
  @for Ember
  @param {Object} original The object to merge into
  @param {Object} updates The object to copy properties from
  @return {Object}
*/
Ember.fastMerge = function(original, updates) {
  for (var prop in updates) {
    if (!updates.hasOwnProperty(prop)) { continue; }
    original[prop] = updates[prop];
  }
  return original;
};

/**
  Returns true if the passed value is null or undefined. This avoids errors
  from JSLint complaining about use of ==, which can be technically
  confusing.

  ```javascript
  Ember.isNone();              // true
  Ember.isNone(null);          // true
  Ember.isNone(undefined);     // true
  Ember.isNone('');            // false
  Ember.isNone([]);            // false
  Ember.isNone(function() {});  // false
  ```

  @method isNone
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
Ember.isNone = function(obj) {
  return obj === null || obj === undefined;
};
Ember.none = Ember.deprecateFunc("Ember.none is deprecated. Please use Ember.isNone instead.", Ember.isNone);

/**
  Verifies that a value is `null` or an empty string, empty array,
  or empty function.

  Constrains the rules on `Ember.isNone` by returning false for empty
  string and empty arrays.

  ```javascript
  Ember.isEmpty();                // true
  Ember.isEmpty(null);            // true
  Ember.isEmpty(undefined);       // true
  Ember.isEmpty('');              // true
  Ember.isEmpty([]);              // true
  Ember.isEmpty('Adam Hawkins');  // false
  Ember.isEmpty([0,1,2]);         // false
  ```

  @method isEmpty
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
Ember.isEmpty = function(obj) {
  return Ember.isNone(obj) || (obj.length === 0 && typeof obj !== 'function') || (typeof obj === 'object' && Ember.get(obj, 'length') === 0);
};
Ember.empty = Ember.deprecateFunc("Ember.empty is deprecated. Please use Ember.isEmpty instead.", Ember.isEmpty);

if (Ember.FEATURES.isEnabled('ember-metal-is-blank')) {
  /**
    A value is blank if it is empty or a whitespace string.

    ```javascript
    Ember.isBlank();                // true
    Ember.isBlank(null);            // true
    Ember.isBlank(undefined);       // true
    Ember.isBlank('');              // true
    Ember.isBlank([]);              // true
    Ember.isBlank('\n\t');          // true
    Ember.isBlank('  ');            // true
    Ember.isBlank({});              // false
    Ember.isBlank('\n\t Hello');    // false
    Ember.isBlank('Hello world');   // false
    Ember.isBlank([1,2,3]);         // false
    ```

    @method isBlank
    @for Ember
    @param {Object} obj Value to test
    @return {Boolean}
  */
  Ember.isBlank = function(obj) {
    return Ember.isEmpty(obj) || (typeof obj === 'string' && obj.match(/\S/) === null);
  };
}
