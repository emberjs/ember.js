/**
@module ember-metal
*/

import Ember from 'ember-metal/core';
import {
  isPath,
  hasThis as pathHasThis
} from 'ember-metal/path_cache';
import { symbol } from 'ember-metal/utils';

export let INTERCEPT_GET = symbol('INTERCEPT_GET');
export let UNHANDLED_GET = symbol('UNHANDLED_GET');

// ..........................................................
// GET AND SET
//
// If we are on a platform that supports accessors we can use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

/**
  Gets the value of a property on an object. If the property is computed,
  the function will be invoked. If the property is not defined but the
  object implements the `unknownProperty` method then that will be invoked.

  If you plan to run on IE8 and older browsers then you should use this
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private. (Properties beginning with an underscore '_'
  are considered private.)

  On all newer browsers, you only need to use this method to retrieve
  properties if the property might not be defined on the object and you want
  to respect the `unknownProperty` handler. Otherwise you can ignore this
  method.

  Note that if the object itself is `undefined`, this method will throw
  an error.

  @method get
  @for Ember
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The property key to retrieve
  @return {Object} the property value or `null`.
  @public
*/
export function get(obj, key) {
  Ember.assert(`Get must be called with two arguments; an object and a property key`, arguments.length === 2);
  Ember.assert(`Cannot call get with '${key}' on an undefined object.`, obj !== undefined && obj !== null);
  Ember.assert(`The key provided to get must be a string, you passed ${key}`, typeof key === 'string');
  Ember.assert(`'this' in paths is not supported`, !pathHasThis(key));


  var value = obj[key];
  if (value === undefined && isPath(key)) {
    return _getPath(obj, key);
  }
  if (typeof obj !== 'function' && typeof obj !== 'object') {
    return value;
  }
  return _get(obj, key, obj.__ember_meta__);
}

function _descriptor(value) {
  if (value !== null && typeof value === 'object' && value.isDescriptor) {
    return value;
  }
}

function _get(obj, key, meta) {
  if (typeof obj[INTERCEPT_GET] === 'function') {
    let result = obj[INTERCEPT_GET](obj, key);
    if (result !== UNHANDLED_GET) { return result; }
  }

  var ret = obj[key];
  var desc = _descriptor(ret);
  if (desc) {
    return desc.get(obj, key);
  }

  if (ret === undefined && 'function' === typeof obj.unknownProperty && !(key in obj)) {
    return obj.unknownProperty(key);
  }

  return ret;
}

export function _getPath(root, path) {
  var obj = root;
  var parts = path.split('.');
  var value;
  for (var idx = 0; obj != null && idx < parts.length; idx++) {
    if (typeof obj !== 'object' && obj !== 'function') {
      value = _get(obj, parts[idx], obj.__ember_meta__);
    } else {
      value = obj[parts[idx]];
    }
    obj = value;
  }
  return value;
}

export function getWithDefault(root, key, defaultValue) {
  var value = get(root, key);

  if (value === undefined) { return defaultValue; }
  return value;
}

export default get;
