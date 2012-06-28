// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

var META_KEY = Ember.META_KEY, get, set;

// ..........................................................
// GET AND SET
//
// If we are on a platform that supports accessors we can get use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

/** @private */
get = function get(obj, keyName) {
  Ember.assert("You need to provide an object and key to `get`.", !!obj && keyName);
  var meta = obj[META_KEY], desc = meta && meta.descs[keyName], ret;
  if (desc) {
    return desc.get(obj, keyName);
  } else {
    var isUnknown = 'object' === typeof obj && !(keyName in obj);

    if (isUnknown && 'function' === typeof obj.unknownProperty) {
      return obj.unknownProperty(keyName);
    }

    return obj[keyName];
  }
};

/** @private */
set = function set(obj, keyName, value) {
  Ember.assert("You need to provide an object and key to `set`.", !!obj && keyName !== undefined);

  var meta = obj[META_KEY], desc = meta && meta.descs[keyName];
  if (desc) {
    desc.set(obj, keyName, value);
  }
  else {
    var isUnknown = 'object' === typeof obj && !(keyName in obj);

    // setUnknownProperty is called if `obj` is an object,
    // the property does not already exist, and the
    // `setUnknownProperty` method exists on the object
    if (isUnknown && 'function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if (meta && meta.watching[keyName]) {
      // only trigger a change if the value has changed
      if (value !== obj[keyName]) {
        Ember.propertyWillChange(obj, keyName);
        obj[keyName] = value;
        Ember.propertyDidChange(obj, keyName);
      }
    } else {
      obj[keyName] = value;
    }
  }
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

if (Ember.config.overrideAccessors) {
  Ember.config.overrideAccessors();
  get = Ember.get;
  set = Ember.set;
}

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

  return [ target, path ];
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

  if (typeof root === 'string' && IS_GLOBAL.test(root)) {
    value = path;
    path = root;
    root = null;
  }

  if (path.indexOf('.') > 0) {
    // get the last part of the path
    keyName = path.slice(path.lastIndexOf('.') + 1);

    // get the first part of the part
    path    = path.slice(0, path.length-(keyName.length+1));

    // unless the path is this, look up the first part to
    // get the root
    if (path !== 'this') {
      root = Ember.getPath(root, path);
    }
  } else {
    Ember.assert("A global path passed to setPath must have at least one period", !IS_GLOBAL.test(path) || path.indexOf(".") > -1);
    keyName = path;
  }

  if (!keyName || keyName.length === 0) {
    throw new Error('You passed an empty path');
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
