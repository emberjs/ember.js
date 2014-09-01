import Ember from "ember-metal/core";
import {
  meta,
  typeOf
} from "ember-metal/utils";
import { defineProperty as o_defineProperty } from "ember-metal/platform";

var metaFor = meta; // utils.js


export function watchKey(obj, keyName, meta) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && typeOf(obj) === 'array') { return; }

  var m = meta || metaFor(obj), watching = m.watching;

  // activate watching first time
  if (!watching[keyName]) {
    watching[keyName] = 1;

    var desc = m.descs[keyName];
    if (desc && desc.willWatch) { desc.willWatch(obj, keyName); }

    if ('function' === typeof obj.willWatchProperty) {
      obj.willWatchProperty(keyName);
    }

    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      handleMandatorySetter(m, obj, keyName);
    }
  } else {
    watching[keyName] = (watching[keyName] || 0) + 1;
  }
}

function handleMandatorySetter(m, keyName, obj) {
  // this x in Y deopts, so keeping it in this function is better;
  if (keyName in obj) {
    m.values[keyName] = obj[keyName];
    o_defineProperty(obj, keyName, {
      configurable: true,
      enumerable: obj.propertyIsEnumerable(keyName),
      set: Ember.MANDATORY_SETTER_FUNCTION,
      get: Ember.DEFAULT_GETTER_FUNCTION(keyName)
    });
  }
}


export function unwatchKey(obj, keyName, meta) {
  var m = meta || metaFor(obj), watching = m.watching;

  if (watching[keyName] === 1) {
    watching[keyName] = 0;

    var desc = m.descs[keyName];
    if (desc && desc.didUnwatch) { desc.didUnwatch(obj, keyName); }

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      if (keyName in obj) {
        o_defineProperty(obj, keyName, {
          configurable: true,
          enumerable: obj.propertyIsEnumerable(keyName),
          set: function(val) {
            // redefine to set as enumerable
            o_defineProperty(obj, keyName, {
              configurable: true,
              writable: true,
              enumerable: true,
              value: val
            });
            delete m.values[keyName];
          },
          get: Ember.DEFAULT_GETTER_FUNCTION(keyName)
        });
      }
    }
  } else if (watching[keyName] > 1) {
    watching[keyName]--;
  }
}
