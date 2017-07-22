/**
@module @ember/object
*/

import { assert } from 'ember-debug';

const ALLOWABLE_TYPES = {
  object: true,
  function: true,
  string: true
};

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

  ```javascript
  Ember.get(obj, "name");
  ```

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
  @for @ember/object
  @static
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The property key to retrieve
  @return {Object} the property value or `null`.
  @public
*/
export function get(obj, keyName) {
  assert(`Get must be called with two arguments; an object and a property key`, arguments.length === 2);
  assert(`Cannot call get with '${keyName}' on an undefined object.`, obj !== undefined && obj !== null);
  assert(`The key provided to get must be a string, you passed ${keyName}`, typeof keyName === 'string');
  assert(`'this' in paths is not supported`, keyName.lastIndexOf('this.', 0) !== 0);
  assert('Cannot call `Ember.get` with an empty string', keyName !== '');

  let keys = keyName.split('.');
  return keys.length === 1 ? _get(obj, keyName) : _getPath(obj, keys);
}

function _get(obj, keyName) {
  let value = obj[keyName];
  let isDescriptor = value !== null && typeof value === 'object' && value.isDescriptor;

  if (isDescriptor) {
    return value.get(obj, keyName);
  } else if (value === undefined && 'object' === typeof obj && !(keyName in obj) &&
    typeof obj.unknownProperty === 'function') {
    return obj.unknownProperty(keyName);
  } else {
    return value;
  }
}

export function _getPath(root, pathParts) {
  let obj = root;

  for (let i = 0; i < pathParts.length; i++) {
    if (!isGettable(obj)) {
      return undefined;
    }

    obj = _get(obj, pathParts[i]);

    if (obj && obj.isDestroyed) {
      return undefined;
    }
  }

  return obj;
}

function isGettable(obj) {
  return obj !== undefined && obj !== null && ALLOWABLE_TYPES[typeof obj];
}

/**
  Retrieves the value of a property from an Object, or a default value in the
  case that the property returns `undefined`.

  ```javascript
  Ember.getWithDefault(person, 'lastName', 'Doe');
  ```

  @method getWithDefault
  @for @ember/object
  @static
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The name of the property to retrieve
  @param {Object} defaultValue The value to return if the property value is undefined
  @return {Object} The property value or the defaultValue.
  @public
*/
export function getWithDefault(root, key, defaultValue) {
  let value = get(root, key);

  if (value === undefined) { return defaultValue; }
  return value;
}

export default get;
