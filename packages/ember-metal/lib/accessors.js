// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

var USE_ACCESSORS = Ember.platform.hasPropertyAccessors && Ember.ENV.USE_ACCESSORS;
Ember.USE_ACCESSORS = !!USE_ACCESSORS;

var meta = Ember.meta;

// ..........................................................
// GET AND SET
//
// If we are on a platform that supports accessors we can get use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

var get, set;

/** @private */
var basicGet = function get(obj, keyName) {
  var ret = obj[keyName];
  if (ret !== undefined) { return ret; }

  // if the property's value is undefined and the object defines
  // unknownProperty, invoke unknownProperty
  if ('function' === typeof obj.unknownProperty) {
    return obj.unknownProperty(keyName);
  }
};

/** @private */
var basicSet = function set(obj, keyName, value) {
  var isObject = 'object' === typeof obj;
  var hasProp = isObject && !(keyName in obj);

  // setUnknownProperty is called if `obj` is an object,
  // the property does not already exist, and the
  // `setUnknownProperty` method exists on the object
  var unknownProp = hasProp && 'function' === typeof obj.setUnknownProperty;

  if (unknownProp) {
    obj.setUnknownProperty(keyName, value);
  } else {
    obj[keyName] = value;
  }
};

/** @private */
get = function(obj, keyName) {
  Ember.assert("You need to provide an object and key to `get`.", !!obj && keyName);

  var desc = meta(obj, false).descs[keyName];
  if (desc) { return desc.get(obj, keyName); }
  else { return basicGet(obj, keyName); }
};

/** @private */
set = function(obj, keyName, value) {
  Ember.assert("You need to provide an object and key to `set`.", !!obj && keyName !== undefined);

  var desc = meta(obj, false).descs[keyName];
  if (desc) { desc.set(obj, keyName, value); }
  else { basicSet(obj, keyName, value); }
  return value;
};

/**
  @function

  Gets the value of a property on an object.  If the property is computed,
  the function will be invoked.  If the property is not defined but the
  object implements the unknownProperty() method then that will be invoked.

  If you plan to run on IE8 and older browsers then you should use this
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with
  an underscore '_' are considered private.)

  On all newer browsers, you only need to use this method to retrieve
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.

  Note that if the obj itself is null, this method will simply return
  undefined.

  @param {Object} obj
    The object to retrieve from.

  @param {String} keyName
    The property key to retrieve

  @returns {Object} the property value or null.
*/
Ember.get = get;

/**
  @function

  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.  If the
  property is not defined but the object implements the unknownProperty()
  method then that will be invoked as well.

  If you plan to run on IE8 and older browsers then you should use this
  method anytime you want to set a property on an object that you don't
  know for sure is private.  (My convention only properties beginning with
  an underscore '_' are considered private.)

  On all newer browsers, you only need to use this method to set
  properties if the property might not be defined on the object and you want
  to respect the unknownProperty() handler.  Otherwise you can ignore this
  method.

  @param {Object} obj
    The object to modify.

  @param {String} keyName
    The property key to set

  @param {Object} value
    The value to set

  @returns {Object} the passed value.
*/
Ember.set = set;

// ..........................................................
// PATHS
//

/** @private */
function getPath(target, path) {
  var parts = path.split(".");
  for (var i=0, l=parts.length; target && i<l; i++) {
    target = get(target, parts[i]);
    if (target && target.isDestroyed) { return undefined; }
  }
  return target;
}

var TUPLE_RET = [];
var IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$]))/;
var IS_GLOBAL_PATH = /^([A-Z$]|([0-9][A-Z$])).*[\.\*]/;
var HAS_THIS  = /^this[\.\*]/;
var FIRST_KEY = /^([^\.\*]+)/;

/** @private */
function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

// assumes path is already normalized
/** @private */
function normalizeTuple(target, path) {
  var hasThis  = HAS_THIS.test(path),
      isGlobal = !hasThis && IS_GLOBAL_PATH.test(path),
      key;

  if (!target || isGlobal) target = window;
  if (hasThis) path = path.slice(5);

  if (target === window) {
    key = firstKey(path);
    target = get(target, key);
    path   = path.slice(key.length+1);
  }

  // must return some kind of path to be valid else other things will break.
  if (!path || path.length===0) throw new Error('Invalid Path');

  TUPLE_RET[0] = target;
  TUPLE_RET[1] = path;
  return TUPLE_RET;
}

/** @private */
Ember.isGlobal = function(path) {
  return IS_GLOBAL.test(path);
};

/**
  @private

  Normalizes a target/path pair to reflect that actual target/path that should
  be observed, etc.  This takes into account passing in global property
  paths (i.e. a path beginning with a captial letter not defined on the
  target) and * separators.

  @param {Object} target
    The current target.  May be null.

  @param {String} path
    A path on the target or a global property path.

  @returns {Array} a temporary array with the normalized target/path pair.
*/
Ember.normalizeTuple = function(target, path) {
  return normalizeTuple(target, path);
};

Ember.normalizeTuple.primitive = normalizeTuple;

Ember.getWithDefault = function(root, key, defaultValue) {
  var value = Ember.get(root, key);

  if (value === undefined) { return defaultValue; }
  return value;
};

Ember.getPath = function(root, path) {
  var hasThis, isGlobal, ret;

  // Helpers that operate with 'this' within an #each
  if (path === '') {
    return root;
  }

  if (!path && 'string'===typeof root) {
    path = root;
    root = null;
  }

  // If there is no root and path is a key name, return that
  // property from the global object.
  // E.g. getPath('Ember') -> Ember
  if (root === null && path.indexOf('.') < 0) { return get(window, path); }

  // detect complicated paths and normalize them
  hasThis  = HAS_THIS.test(path);

  if (!root || hasThis) {
    var tuple = normalizeTuple(root, path);
    root = tuple[0];
    path = tuple[1];
    tuple.length = 0;
  }

  return getPath(root, path);
};

Ember.setPath = function(root, path, value, tolerant) {
  var keyName;

  if (arguments.length===2 && 'string' === typeof root) {
    value = path;
    path = root;
    root = null;
  }


  if (path.indexOf('.') > 0) {
    keyName = path.slice(path.lastIndexOf('.')+1);
    path    = path.slice(0, path.length-(keyName.length+1));
    if (path !== 'this') {
      root = Ember.getPath(root, path);
    }

  } else {
    if (IS_GLOBAL.test(path)) throw new Error('Invalid Path');
    keyName = path;
  }

  if (!keyName || keyName.length===0 || keyName==='*') {
    throw new Error('Invalid Path');
  }

  if (!root) {
    if (tolerant) { return; }
    else { throw new Error('Object in path '+path+' could not be found or was destroyed.'); }
  }

  return Ember.set(root, keyName, value);
};

/**
  Error-tolerant form of Ember.setPath. Will not blow up if any part of the
  chain is undefined, null, or destroyed.

  This is primarily used when syncing bindings, which may try to update after
  an object has been destroyed.
*/
Ember.trySetPath = function(root, path, value) {
  if (arguments.length===2 && 'string' === typeof root) {
    value = path;
    path = root;
    root = null;
  }

  return Ember.setPath(root, path, value, true);
};

/**
  Returns true if the provided path is global (e.g., "MyApp.fooController.bar")
  instead of local ("foo.bar.baz").

  @param {String} path
  @returns Boolean
*/
Ember.isGlobalPath = function(path) {
  return !HAS_THIS.test(path) && IS_GLOBAL.test(path);
};
