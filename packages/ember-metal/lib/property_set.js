import { HAS_NATIVE_PROXY, toString } from 'ember-utils';
import EmberError from '@ember/error';
import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import { getPossibleMandatoryProxyValue, _getPath as getPath } from './property_get';
import { notifyPropertyChange } from './property_events';

import { isPath } from './path_cache';
import { isDescriptor, peekMeta, descriptorFor } from './meta';

/**
 @module @ember/object
*/
/**
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.
  If the specified property is not defined on the object and the object
  implements the `setUnknownProperty` method, then instead of setting the
  value of the property on the object, its `setUnknownProperty` handler
  will be invoked with the two parameters `keyName` and `value`.

  ```javascript
  import { set } from '@ember/object';
  set(obj, "name", value);
  ```

  @method set
  @static
  @for @ember/object
  @param {Object} obj The object to modify.
  @param {String} keyName The property key to set
  @param {Object} value The value to set
  @return {Object} the passed value.
  @public
*/
export function set(obj, keyName, value, tolerant) {
  assert(
    `Set must be called with three or four arguments; an object, a property key, a value and tolerant true/false`,
    arguments.length === 3 || arguments.length === 4
  );
  assert(
    `Cannot call set with '${keyName}' on an undefined object.`,
    (obj && typeof obj === 'object') || typeof obj === 'function'
  );
  assert(
    `The key provided to set must be a string or number, you passed ${keyName}`,
    typeof keyName === 'string' || (typeof keyName === 'number' && !isNaN(keyName))
  );
  assert(
    `'this' in paths is not supported`,
    typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0
  );

  if (obj.isDestroyed) {
    assert(
      `calling set on destroyed object: ${toString(obj)}.${keyName} = ${toString(value)}`,
      tolerant
    );
    return;
  }

  if (isPath(keyName)) {
    return setPath(obj, keyName, value, tolerant);
  }

  let possibleDesc = descriptorFor(obj, keyName);

  if (possibleDesc !== undefined) {
    /* computed property */
    possibleDesc.set(obj, keyName, value);
    return value;
  }

  let currentValue;
  if (DEBUG && HAS_NATIVE_PROXY) {
    currentValue = getPossibleMandatoryProxyValue(obj, keyName);
  } else {
    currentValue = obj[keyName];
  }

  if (isDescriptor(currentValue)) {
    /* computed property */
    currentValue.set(obj, keyName, value);
  } else if (
    currentValue === undefined &&
    'object' === typeof obj &&
    !(keyName in obj) &&
    typeof obj.setUnknownProperty === 'function'
  ) {
    /* unknown property */
    obj.setUnknownProperty(keyName, value);
  } else {
    let meta = peekMeta(obj);

    if (DEBUG) {
      setWithMandatorySetter(meta, obj, keyName, value);
    } else {
      obj[keyName] = value;
    }

    if (currentValue !== value) {
      notifyPropertyChange(obj, keyName, meta);
    }
  }

  return value;
}

if (DEBUG) {
  var setWithMandatorySetter = (meta, obj, keyName, value) => {
    if (meta !== undefined && meta.peekWatching(keyName) > 0) {
      makeEnumerable(obj, keyName);
      meta.writeValue(obj, keyName, value);
    } else {
      obj[keyName] = value;
    }
  };

  var makeEnumerable = (obj, key) => {
    let desc = Object.getOwnPropertyDescriptor(obj, key);

    if (desc && desc.set && desc.set.isMandatorySetter) {
      desc.enumerable = true;
      Object.defineProperty(obj, key, desc);
    }
  };
}

function setPath(root, path, value, tolerant) {
  let parts = path.split('.');
  let keyName = parts.pop();

  assert('Property set failed: You passed an empty path', keyName.trim().length > 0);

  let newPath = parts.join('.');

  let newRoot = getPath(root, newPath);

  if (newRoot) {
    return set(newRoot, keyName, value);
  } else if (!tolerant) {
    throw new EmberError(
      `Property set failed: object in path "${newPath}" could not be found or was destroyed.`
    );
  }
}

/**
  Error-tolerant form of `set`. Will not blow up if any part of the
  chain is `undefined`, `null`, or destroyed.

  This is primarily used when syncing bindings, which may try to update after
  an object has been destroyed.

  ```javascript
  import { trySet } from '@ember/object';

  let obj = { name: "Zoey" };
  trySet(obj, "contacts.twitter", "@emberjs");
  ```

  @method trySet
  @static
  @for @ember/object
  @param {Object} root The object to modify.
  @param {String} path The property path to set
  @param {Object} value The value to set
  @public
*/
export function trySet(root, path, value) {
  return set(root, path, value, true);
}
