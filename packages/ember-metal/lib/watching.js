require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');
require('ember-metal/expand_properties');
require('ember-metal/property_get');
require('ember-metal/properties');
require('ember-metal/watch_key');
require('ember-metal/watch_path');

/**
@module ember-metal
*/

var metaFor = Ember.meta, // utils.js
    GUID_KEY = Ember.GUID_KEY, // utils.js
    META_KEY = Ember.META_KEY, // utils.js
    expandProperties = Ember.expandProperties,
    removeChainWatcher = Ember.removeChainWatcher,
    watchKey = Ember.watchKey, // watch_key.js
    unwatchKey = Ember.unwatchKey,
    watchPath = Ember.watchPath, // watch_path.js
    unwatchPath = Ember.unwatchPath,
    typeOf = Ember.typeOf, // utils.js
    generateGuid = Ember.generateGuid,
    IS_PATH = /[\.\*]/;

// returns true if the passed path is just a keyName
function isKeyName(path) {
  return path==='*' || !IS_PATH.test(path);
}

/**
  @private

  Starts watching a property on an object. Whenever the property changes,
  invokes `Ember.propertyWillChange` and `Ember.propertyDidChange`. This is the
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  `Ember.addObserver()`

  @method watch
  @for Ember
  @param obj
  @param {String} keyName
*/
Ember.watch = function(obj, _keyPath) {
  // can't watch length on Array - it is special...
  if (_keyPath === 'length' && typeOf(obj) === 'array') { return; }

  expandProperties(_keyPath, function (keyPath) {
    if (isKeyName(keyPath)) {
      watchKey(obj, keyPath);
    } else {
      watchPath(obj, keyPath);
    }
  });
};

Ember.isWatching = function isWatching(obj, key) {
  var meta = obj[META_KEY];
  return (meta && meta.watching[key]) > 0;
};

Ember.watch.flushPending = Ember.flushPendingChains;

Ember.unwatch = function(obj, _keyPath) {
  // can't watch length on Array - it is special...
  if (_keyPath === 'length' && typeOf(obj) === 'array') { return; }

  expandProperties(_keyPath, function (keyPath) {
    if (isKeyName(keyPath)) {
      unwatchKey(obj, keyPath);
    } else {
      unwatchPath(obj, keyPath);
    }
  });
};

/**
  @private

  Call on an object when you first beget it from another object. This will
  setup any chained watchers on the object instance as needed. This method is
  safe to call multiple times.

  @method rewatch
  @for Ember
  @param obj
*/
Ember.rewatch = function(obj) {
  var m = metaFor(obj, false), chains = m.chains;

  // make sure the object has its own guid.
  if (GUID_KEY in obj && !obj.hasOwnProperty(GUID_KEY)) {
    generateGuid(obj);
  }

  // make sure any chained watchers update.
  if (chains && chains.value() !== obj) {
    m.chains = chains.copy(obj);
  }
};

var NODE_STACK = [];

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method destroy
  @for Ember
  @param {Object} obj  the object to destroy
  @return {void}
*/
Ember.destroy = function (obj) {
  var meta = obj[META_KEY], node, nodes, key, nodeObject;
  if (meta) {
    obj[META_KEY] = null;
    // remove chainWatchers to remove circular references that would prevent GC
    node = meta.chains;
    if (node) {
      NODE_STACK.push(node);
      // process tree
      while (NODE_STACK.length > 0) {
        node = NODE_STACK.pop();
        // push children
        nodes = node._chains;
        if (nodes) {
          for (key in nodes) {
            if (nodes.hasOwnProperty(key)) {
              NODE_STACK.push(nodes[key]);
            }
          }
        }
        // remove chainWatcher in node object
        if (node._watching) {
          nodeObject = node._object;
          if (nodeObject) {
            removeChainWatcher(nodeObject, node._key, node);
          }
        }
      }
    }
  }
};
