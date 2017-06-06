import { toString } from 'ember-utils';
import { assert, Error as EmberError } from 'ember-debug';
import { _getPath as getPath } from './property_get';
import {
  propertyWillChange,
  propertyDidChange
} from './property_events';

import {
  isPath,
  hasThis as pathHasThis
} from './path_cache';
import {
  peekMeta
} from './meta';
import { MANDATORY_SETTER } from 'ember/features';

/**
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change. If the
  property is not defined but the object implements the `setUnknownProperty`
  method then that will be invoked as well.

  ```javascript
  Ember.set(obj, "name", value);
  ```

  @method set
  @for Ember
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
  assert(`Cannot call set with '${keyName}' on an undefined object.`, obj && typeof obj === 'object' || typeof obj === 'function');
  assert(`The key provided to set must be a string, you passed ${keyName}`, typeof keyName === 'string');
  assert(`'this' in paths is not supported`, !pathHasThis(keyName));
  assert(`calling set on destroyed object: ${toString(obj)}.${keyName} = ${toString(value)}`, !obj.isDestroyed);

  if (isPath(keyName)) {
    return setPath(obj, keyName, value, tolerant);
  }

  let meta = peekMeta(obj);
  let possibleDesc = obj[keyName];

  let desc, currentValue;
  if (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) {
    desc = possibleDesc;
  } else {
    currentValue = possibleDesc;
  }

  if (desc) { /* computed property */
    desc.set(obj, keyName, value);
  } else if (obj.setUnknownProperty && currentValue === undefined && !(keyName in obj)) { /* unknown property */
    assert('setUnknownProperty must be a function', typeof obj.setUnknownProperty === 'function');
    obj.setUnknownProperty(keyName, value);
  } else if (currentValue === value) { /* no change */
    return value;
  } else {
    propertyWillChange(obj, keyName, meta);

    if (MANDATORY_SETTER) {
      setWithMandatorySetter(meta, obj, keyName, value);
    } else {
      obj[keyName] = value;
    }

    propertyDidChange(obj, keyName, meta);
  }

  return value;
}

if (MANDATORY_SETTER) {
  var setWithMandatorySetter = (meta, obj, keyName, value) => {
    if (meta && meta.peekWatching(keyName) > 0) {
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
  // get the last part of the path
  let keyName = path.slice(path.lastIndexOf('.') + 1);

  // get the first part of the part
  path = (path === keyName) ? keyName : path.slice(0, path.length - (keyName.length + 1));

  // unless the path is this, look up the first part to
  // get the root
  if (path !== 'this') {
    root = getPath(root, path);
  }

  if (!keyName || keyName.length === 0) {
    throw new EmberError('Property set failed: You passed an empty path');
  }

  if (!root) {
    if (tolerant) {
      return;
    } else {
      throw new EmberError(`Property set failed: object in path "${path}" could not be found or was destroyed.`);
    }
  }

  return set(root, keyName, value);
}

/**
  Error-tolerant form of `Ember.set`. Will not blow up if any part of the
  chain is `undefined`, `null`, or destroyed.

  This is primarily used when syncing bindings, which may try to update after
  an object has been destroyed.

  @method trySet
  @for Ember
  @param {Object} root The object to modify.
  @param {String} path The property path to set
  @param {Object} value The value to set
  @public
*/
export function trySet(root, path, value) {
  return set(root, path, value, true);
}
