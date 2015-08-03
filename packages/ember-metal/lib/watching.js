/**
@module ember-metal
*/

import {
  removeChainWatcher,
  flushPendingChains
} from 'ember-metal/chains';
import {
  watchKey,
  unwatchKey
} from 'ember-metal/watch_key';
import {
  watchPath,
  unwatchPath
} from 'ember-metal/watch_path';
import {
  isPath
} from 'ember-metal/path_cache';

/**
  Starts watching a property on an object. Whenever the property changes,
  invokes `Ember.propertyWillChange` and `Ember.propertyDidChange`. This is the
  primitive used by observers and dependent keys; usually you will never call
  this method directly but instead use higher level methods like
  `Ember.addObserver()`

  @private
  @method watch
  @for Ember
  @param obj
  @param {String} _keyPath
*/
function watch(obj, _keyPath, m) {
  // can't watch length on Array - it is special...
  if (_keyPath === 'length' && Array.isArray(obj)) { return; }

  if (!isPath(_keyPath)) {
    watchKey(obj, _keyPath, m);
  } else {
    watchPath(obj, _keyPath, m);
  }
}

export { watch };

export function isWatching(obj, key) {
  var meta = obj['__ember_meta__'];
  return (meta && meta.peekWatching(key)) > 0;
}

watch.flushPending = flushPendingChains;

export function unwatch(obj, _keyPath, m) {
  // can't watch length on Array - it is special...
  if (_keyPath === 'length' && Array.isArray(obj)) { return; }

  if (!isPath(_keyPath)) {
    unwatchKey(obj, _keyPath, m);
  } else {
    unwatchPath(obj, _keyPath, m);
  }
}

var NODE_STACK = [];

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method destroy
  @for Ember
  @param {Object} obj  the object to destroy
  @return {void}
  @private
*/
export function destroy(obj) {
  var meta = obj['__ember_meta__'];
  var node, nodes, key, nodeObject;

  if (meta) {
    obj['__ember_meta__'] = null;
    // remove chainWatchers to remove circular references that would prevent GC
    node = meta.getChains();
    if (node) {
      NODE_STACK.push(node);
      // process tree
      while (NODE_STACK.length > 0) {
        node = NODE_STACK.pop();
        // push children
        nodes = node._chains;
        if (nodes) {
          for (key in nodes) {
            if (nodes[key] !== undefined) {
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
}
