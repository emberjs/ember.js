import { assert } from 'ember-metal/debug';
import isEnabled from 'ember-metal/features';
import { _getPath as getPath } from 'ember-metal/property_get';
import {
  PROPERTY_DID_CHANGE,
  propertyWillChange,
  propertyDidChange
} from 'ember-metal/property_events';
import { defineProperty } from 'ember-metal/properties';
import EmberError from 'ember-metal/error';
import {
  isPath,
  hasThis as pathHasThis
} from 'ember-metal/path_cache';

/**
  Sets the value of a property on an object, respecting computed properties
  and notifying observers and other listeners of the change. If the
  property is not defined but the object implements the `setUnknownProperty`
  method then that will be invoked as well.

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
  assert(`Cannot call set with '${keyName}' on an undefined object.`, obj !== undefined && obj !== null);
  assert(`The key provided to set must be a string, you passed ${keyName}`, typeof keyName === 'string');
  assert(`'this' in paths is not supported`, !pathHasThis(keyName));

  var meta, possibleDesc, desc;
  if (obj) {
    meta = obj['__ember_meta__'];
    possibleDesc = obj[keyName];
    desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;
  }

  var isUnknown, currentValue;
  if (desc === undefined && isPath(keyName)) {
    return setPath(obj, keyName, value, tolerant);
  }

  assert('calling set on destroyed object', !obj.isDestroyed);

  if (desc) {
    desc.set(obj, keyName, value);
  } else {
    if (value !== undefined && typeof obj === 'object' && obj[keyName] === value) {
      return value;
    }

    isUnknown = 'object' === typeof obj && !(keyName in obj);

    // setUnknownProperty is called if `obj` is an object,
    // the property does not already exist, and the
    // `setUnknownProperty` method exists on the object
    if (isUnknown && 'function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if (meta && meta.peekWatching(keyName) > 0) {
      if (meta.proto !== obj) {
        if (isEnabled('mandatory-setter')) {
          currentValue = meta.peekValues(keyName);
        } else {
          currentValue = obj[keyName];
        }
      }
      // only trigger a change if the value has changed
      if (value !== currentValue) {
        propertyWillChange(obj, keyName);
        if (isEnabled('mandatory-setter')) {
          if (
            (currentValue === undefined && !(keyName in obj)) ||
            !Object.prototype.propertyIsEnumerable.call(obj, keyName)
          ) {
            defineProperty(obj, keyName, null, value); // setup mandatory setter
          } else {
            meta.writeValues(keyName, value);
          }
        } else {
          obj[keyName] = value;
        }
        propertyDidChange(obj, keyName);
      }
    } else {
      obj[keyName] = value;
      if (obj[PROPERTY_DID_CHANGE]) {
        obj[PROPERTY_DID_CHANGE](keyName);
      }
    }
  }
  return value;
}

function setPath(root, path, value, tolerant) {
  var keyName;

  // get the last part of the path
  keyName = path.slice(path.lastIndexOf('.') + 1);

  // get the first part of the part
  path    = (path === keyName) ? keyName : path.slice(0, path.length - (keyName.length + 1));

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
      throw new EmberError('Property set failed: object in path "' + path + '" could not be found or was destroyed.');
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
