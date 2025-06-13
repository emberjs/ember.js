import { lookupDescriptor, setWithMandatorySetter, toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { COMPUTED_SETTERS } from './decorator';
import { isPath } from './path_cache';
import { notifyPropertyChange } from './property_events';
import { getPossibleMandatoryProxyValue, _getPath as getPath } from './property_get';

interface ExtendedObject {
  isDestroyed?: boolean;
}

/**
 @module @ember/object
*/
/**
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change.

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
export function set<T>(obj: object, keyName: string, value: T, tolerant?: boolean): T {
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

  if ((obj as ExtendedObject).isDestroyed) {
    assert(
      `calling set on destroyed object: ${toString(obj)}.${keyName} = ${toString(value)}`,
      tolerant
    );
    return value;
  }

  return isPath(keyName) ? _setPath(obj, keyName, value, tolerant) : _setProp(obj, keyName, value);
}

export function _setProp(obj: object, keyName: string, value: any) {
  let descriptor = lookupDescriptor(obj, keyName);

  if (descriptor !== null && COMPUTED_SETTERS.has(descriptor.set!)) {
    (obj as any)[keyName] = value;
    return value;
  }

  let currentValue: any;
  if (DEBUG) {
    currentValue = getPossibleMandatoryProxyValue(obj, keyName);
  } else {
    currentValue = (obj as any)[keyName];
  }

  if (DEBUG) {
    setWithMandatorySetter!(obj, keyName, value);
  } else {
    (obj as any)[keyName] = value;
  }

  if (currentValue !== value) {
    notifyPropertyChange(obj, keyName);
  }

  return value;
}

function _setPath(root: object, path: string, value: any, tolerant?: boolean): any {
  let parts = path.split('.');
  let keyName = parts.pop()!;

  assert('Property set failed: You passed an empty path', keyName.trim().length > 0);

  let newRoot = getPath(root, parts, true);

  if (newRoot !== null && newRoot !== undefined) {
    return set(newRoot, keyName, value);
  } else if (!tolerant) {
    throw new Error(`Property set failed: object in path "${parts.join('.')}" could not be found.`);
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
export function trySet<T>(root: object, path: string, value: T): T | undefined {
  return set(root, path, value, true);
}
