// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Em:true ENV */

if ('undefined' === typeof Ember) {
/**
  @namespace
  @name Ember
  @version 0.9.5

  All Ember methods and functions are defined inside of this namespace.
  You generally should not add new properties to this namespace as it may be
  overwritten by future versions of Ember.

  You can also use the shorthand "Em" instead of "Ember".

  Ember-Runtime is a framework that provides core functions for
  Ember including cross-platform functions, support for property
  observing and objects. Its focus is on small size and performance. You can
  use this in place of or along-side other cross-platform libraries such as
  jQuery.

  The core Runtime framework is based on the jQuery API with a number of
  performance optimizations.
*/

// Create core object. Make it act like an instance of Ember.Namespace so that
// objects assigned to it are given a sane string representation.
Ember = { isNamespace: true, toString: function() { return "Ember"; } };

// aliases needed to keep minifiers from removing the global context
if ('undefined' !== typeof window) {
  window.Em = window.Ember = Em = Ember;
}

}

/**
  @static
  @type String
  @default '0.9.5'
  @constant
*/
Ember.VERSION = '0.9.5';

/**
  @static
  @type Hash
  @constant

  Standard environmental variables.  You can define these in a global `ENV`
  variable before loading Ember to control various configuration
  settings.
*/
Ember.ENV = 'undefined' === typeof ENV ? {} : ENV;


// ..........................................................
// BOOTSTRAP
//

/**
  @static
  @type Boolean
  @default true
  @constant

  Determines whether Ember should enhances some built-in object
  prototypes to provide a more friendly API.  If enabled, a few methods
  will be added to Function, String, and Array.  Object.prototype will not be
  enhanced, which is the one that causes most troubles for people.

  In general we recommend leaving this option set to true since it rarely
  conflicts with other code.  If you need to turn it off however, you can
  define an ENV.EXTEND_PROTOTYPES config to disable it.
*/
Ember.EXTEND_PROTOTYPES = (Ember.ENV.EXTEND_PROTOTYPES !== false);


/**
  @static
  @type Boolean
  @default Ember.EXTEND_PROTOTYPES
  @constant

  Determines whether Ember should add ECMAScript 5 shims to older browsers.
*/
Ember.SHIM_ES5 = (Ember.ENV.SHIM_ES5 === false) ? false : Ember.EXTEND_PROTOTYPES;



/**
  Empty function.  Useful for some operations.

  @returns {Object}
  @private
*/
Ember.K = function() { return this; };

/**
  @namespace
  @name window
  @description The global window object
*/


// Stub out the methods defined by the ember-debug package in case it's not loaded

if ('undefined' === typeof ember_assert) {
  window.ember_assert = Ember.K;
}

if ('undefined' === typeof ember_warn) { window.ember_warn = Ember.K; }

if ('undefined' === typeof ember_deprecate) { window.ember_deprecate = Ember.K; }

if ('undefined' === typeof ember_deprecateFunc) {
  window.ember_deprecateFunc = function(_, func) { return func; };
}

// ..........................................................
// LOGGER
//

/**
  @class

  Inside Ember-Metal, simply uses the window.console object.
  Override this to provide more robust logging functionality.
*/
Ember.Logger = window.console || { log: Ember.K, warn: Ember.K, error: Ember.K };
