/**
@module ember-metal
*/

import { assert } from 'ember-metal/debug';
import { isPath, hasThis } from 'ember-metal/path_cache';

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
export function get(obj, keyName) {
  assert(`Get must be called with two arguments; an object and a property key`, arguments.length === 2);
  assert(`Cannot call get with '${keyName}' on an undefined object.`, obj !== undefined && obj !== null);
  assert(`The key provided to get must be a string, you passed ${keyName}`, typeof keyName === 'string');
  assert(`'this' in paths is not supported`, !hasThis(keyName));

  // Helpers that operate with 'this' within an #each
  if (keyName === '') {
    return obj;
  }

  if (isPath(keyName)) {
    return _getPath(obj, keyName);
  }

  let ret = obj[keyName];

  if (ret === undefined &&
      'object' === typeof obj && !(keyName in obj) && 'function' === typeof obj.unknownProperty) {
    return obj.unknownProperty(keyName);
  }

  return ret;
}

export function _getPath(root, path) {
  let obj = root;
  let parts = path.split('.');
  let len = parts.length;

  for (let i = 0; i < len; i++) {
    if (obj == null) {
      return obj;
    }

    obj = get(obj, parts[i]);

    if (obj && obj.isDestroyed) {
      return undefined;
    }
  }

  return obj;
}

/**
  Retrieves the value of a property from an Object, or a default value in the
  case that the property returns `undefined`.

  ```javascript
  Ember.getWithDefault(person, 'lastName', 'Doe');
  ```

  @method getWithDefault
  @for Ember
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The name of the property to retrieve
  @param {Object} defaultValue The value to return if the property value is undefined
  @return {Object} The property value or the defaultValue.
  @public
*/
export function getWithDefault(root, key, defaultValue) {
  var value = get(root, key);

  if (value === undefined) { return defaultValue; }
  return value;
}

export default get;
