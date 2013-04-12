require('ember-metal/utils');
require('ember-metal/platform');

var metaFor = Ember.meta, // utils.js
    typeOf = Ember.typeOf, // utils.js
    MANDATORY_SETTER = Ember.ENV.MANDATORY_SETTER,
    o_defineProperty = Ember.platform.defineProperty;

Ember.watchKey = function(obj, keyName) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && typeOf(obj) === 'array') { return; }

  var m = metaFor(obj), watching = m.watching;

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
        enumerable: true,
        set: Ember.MANDATORY_SETTER_FUNCTION,
        get: Ember.DEFAULT_GETTER_FUNCTION(keyName)
      });
    }
  } else {
    watching[keyName] = (watching[keyName] || 0) + 1;
  }
};


Ember.unwatchKey = function(obj, keyName) {
  var m = metaFor(obj), watching = m.watching;

  if (watching[keyName] === 1) {
    watching[keyName] = 0;

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (MANDATORY_SETTER && keyName in obj) {
      o_defineProperty(obj, keyName, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: m.values[keyName]
      });
      delete m.values[keyName];
    }
  } else if (watching[keyName] > 1) {
    watching[keyName]--;
  }
};