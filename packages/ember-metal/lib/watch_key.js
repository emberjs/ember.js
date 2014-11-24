import Ember from "ember-metal/core";
import {
  meta as metaFor,
  typeOf
} from "ember-metal/utils";
import {
  defineProperty as o_defineProperty,
  hasPropertyAccessors
} from "ember-metal/platform";
import {
  MANDATORY_SETTER_FUNCTION,
  DEFAULT_GETTER_FUNCTION
} from "ember-metal/properties";

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
      if (hasPropertyAccessors) {
        handleMandatorySetter(m, obj, keyName);
      }
    }
  } else {
    watching[keyName] = (watching[keyName] || 0) + 1;
  }
}


if (Ember.FEATURES.isEnabled('mandatory-setter')) {
  var handleMandatorySetter = function handleMandatorySetter(m, obj, keyName) {
    var descriptor = Object.getOwnPropertyDescriptor && Object.getOwnPropertyDescriptor(obj, keyName);
    var configurable = descriptor ? descriptor.configurable : true;

    // this x in Y deopts, so keeping it in this function is better;
    if (configurable && keyName in obj) {
      m.values[keyName] = obj[keyName];
      o_defineProperty(obj, keyName, {
        configurable: true,
        enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
        set: MANDATORY_SETTER_FUNCTION(keyName),
        get: DEFAULT_GETTER_FUNCTION(keyName)
      });
    }
  };
}

export function unwatchKey(obj, keyName, meta) {
  var m = meta || metaFor(obj);
  var watching = m.watching;

  if (watching[keyName] === 1) {
    watching[keyName] = 0;

    var desc = m.descs[keyName];
    if (desc && desc.didUnwatch) { desc.didUnwatch(obj, keyName); }

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      if (hasPropertyAccessors && keyName in obj) {
        o_defineProperty(obj, keyName, {
          configurable: true,
          enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
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
          get: DEFAULT_GETTER_FUNCTION(keyName)
        });
      }
    }
  } else if (watching[keyName] > 1) {
    watching[keyName]--;
  }
}
