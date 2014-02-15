// require('ember-metal/utils'); // META_KEY
// require('ember-metal/property_get'); // _getPath
// require('ember-metal/property_events'); // propertyWillChange, propertyDidChange
// require('ember-metal/properties');

import Ember from "ember-metal/core";
import {META_KEY} from "ember-metal/utils";
import {_getPath} from "ember-metal/property_get";
import {propertyWillChange, propertyDidChange} from "ember-metal/property_events";
import {defineProperty} from "ember-metal/properties";
import EmberError from "ember-metal/error";

var MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER,
    IS_GLOBAL = /^([A-Z$]|([0-9][A-Z$]))/,
    getPath = _getPath;

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
*/
var set = function set(obj, keyName, value, tolerant) {
  if (typeof obj === 'string') {
    Ember.assert("Path '" + obj + "' must be global if no obj is given.", IS_GLOBAL.test(obj));
    value = keyName;
    keyName = obj;
    obj = null;
  }

  Ember.assert("Cannot call set with "+ keyName +" key.", !!keyName);

  if (!obj || keyName.indexOf('.') !== -1) {
    return setPath(obj, keyName, value, tolerant);
  }

  Ember.assert("You need to provide an object and key to `set`.", !!obj && keyName !== undefined);
  Ember.assert('calling set on destroyed object', !obj.isDestroyed);

  var meta = obj[META_KEY], desc = meta && meta.descs[keyName],
      isUnknown, currentValue;
  if (desc) {
    desc.set(obj, keyName, value);
  } else {
    isUnknown = 'object' === typeof obj && !(keyName in obj);

    // setUnknownProperty is called if `obj` is an object,
    // the property does not already exist, and the
    // `setUnknownProperty` method exists on the object
    if (isUnknown && 'function' === typeof obj.setUnknownProperty) {
      obj.setUnknownProperty(keyName, value);
    } else if (meta && meta.watching[keyName] > 0) {
      if (MANDATORY_SETTER) {
        currentValue = meta.values[keyName];
      } else {
        currentValue = obj[keyName];
      }
      // only trigger a change if the value has changed
      if (value !== currentValue) {
        propertyWillChange(obj, keyName);
        if (MANDATORY_SETTER) {
          if ((currentValue === undefined && !(keyName in obj)) || !obj.propertyIsEnumerable(keyName)) {
            defineProperty(obj, keyName, null, value); // setup mandatory setter
          } else {
            meta.values[keyName] = value;
          }
        } else {
          obj[keyName] = value;
        }
        propertyDidChange(obj, keyName);
      }
    } else {
      obj[keyName] = value;
    }
  }
  return value;
};

// Currently used only by Ember Data tests
// ES6TODO: Verify still true
if (Ember.config.overrideAccessors) {
  Ember.set = set;
  Ember.config.overrideAccessors();
  set = Ember.set;
}

function setPath(root, path, value, tolerant) {
  var keyName;

  // get the last part of the path
  keyName = path.slice(path.lastIndexOf('.') + 1);

  // get the first part of the part
  path    = (path === keyName) ? keyName : path.slice(0, path.length-(keyName.length+1));

  // unless the path is this, look up the first part to
  // get the root
  if (path !== 'this') {
    root = getPath(root, path);
  }

  if (!keyName || keyName.length === 0) {
    throw new EmberError('Property set failed: You passed an empty path');
  }

  if (!root) {
    if (tolerant) { return; }
    else { throw new EmberError('Property set failed: object in path "'+path+'" could not be found or was destroyed.'); }
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
  @param {Object} obj The object to modify.
  @param {String} path The property path to set
  @param {Object} value The value to set
*/
function trySet(root, path, value) {
  return set(root, path, value, true);
};

export {set, trySet};
