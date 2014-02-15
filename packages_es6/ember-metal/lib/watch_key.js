// require('ember-metal/utils');
// require('ember-metal/platform');

import Ember from "ember-metal/core";
import {meta, typeOf} from "ember-metal/utils";
import {platform} from "ember-metal/platform";

var metaFor = meta, // utils.js
    MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER,
    o_defineProperty = platform.defineProperty;

function watchKey(obj, keyName, meta) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && typeOf(obj) === 'array') { return; }

  var m = meta || metaFor(obj), watching = m.watching;

  // activate watching first time
  if (!watching[keyName]) {
    watching[keyName] = 1;

    if ('function' === typeof obj.willWatchProperty) {
      obj.willWatchProperty(keyName);
    }

    if (MANDATORY_SETTER && keyName in obj) {
      m.values[keyName] = obj[keyName];
      o_defineProperty(obj, keyName, {
        configurable: true,
        enumerable: obj.propertyIsEnumerable(keyName),
        set: Ember.MANDATORY_SETTER_FUNCTION,
        get: Ember.DEFAULT_GETTER_FUNCTION(keyName)
      });
    }
  } else {
    watching[keyName] = (watching[keyName] || 0) + 1;
  }
};

function unwatchKey(obj, keyName, meta) {
  var m = meta || metaFor(obj), watching = m.watching;

  if (watching[keyName] === 1) {
    watching[keyName] = 0;

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (MANDATORY_SETTER && keyName in obj) {
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
  } else if (watching[keyName] > 1) {
    watching[keyName]--;
  }
};

export {watchKey, unwatchKey};
