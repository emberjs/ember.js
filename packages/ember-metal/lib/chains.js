import Ember from "ember-metal/core"; // warn, assert, etc;
import { get, normalizeTuple } from "ember-metal/property_get";
import { meta as metaFor } from "ember-metal/utils";
import { forEach } from "ember-metal/array";
import { removeObject } from "ember-metal/enumerable_utils";
import { watchKey, unwatchKey } from "ember-metal/watch_key";

var warn = Ember.warn;
var FIRST_KEY = /^([^\.]+)/;

// Used to keep track of tuples of ChainNodes and paths where the path was for
// a global and that global object was not available when the chain was added.
var pendingQueue = [];

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

function isObject(obj) {
  return obj && (typeof obj === 'object');
}

function isDescriptor(obj) {
  return isObject(obj) && obj.isDescriptor;
}

function getCache(descriptor, meta, key) {
  return descriptor._cacheable && meta.cache && meta.cache[key];
}

function addChainWatcher(obj, keyName, node) {
  if (!isObject(obj)) {
    return;
  }

  var meta = metaFor(obj);

  if (!meta.hasOwnProperty('chainWatchers')) {
    meta.chainWatchers = {};
  }

  if (!meta.chainWatchers[keyName]) {
    meta.chainWatchers[keyName] = [];
  }

  meta.chainWatchers[keyName].push(node);
  watchKey(obj, keyName, meta);
}

function removeChainWatcher(obj, keyName, node) {
  if (!isObject(obj)) {
    return;
  }

  var meta = obj['__ember_meta__'];

  if (!meta || !meta.chainWatchers || !meta.chainWatchers[keyName]) {
    return;
  }

  removeObject(meta.chainWatchers[keyName], node);
  unwatchKey(obj, keyName, meta);
}

function lazyGet(obj, key) {
  if (!obj) {
    return;
  }

  var meta = obj['__ember_meta__'];

  // check if object meant only to be a prototype
  if (meta && meta.proto === obj) {
    return;
  }

  // Use `get` if the return value is an EachProxy or a plain property.
  if (key === "@each" || !isDescriptor(obj[key])) {
    return get(obj, key);
  // Otherwise get the cached value of the computed property.
  } else {
    return getCache(obj[key], meta, key);
  }
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
function ChainNode(parent, key, value) {
  this._parent = parent;
  this._key    = key;
  this._value = value;

  // Used to keep track of the number of times each path is added to a ChainNode.
  this._paths = {};

  // Used to keep track of how many nodes are in a chain.
  this.count = 0;

  // When the value for this ChainNode is unset, `_watching` is true.
  // We set this flag so that we later have a means of deactivating this
  // ChainNode when it is destroyed by setting `_watching` to false.
  //
  // We expect `_watching` to be false when the ChainNode is the root of a
  // chain (because we have no parent) and for global paths (because the parent
  // node is the object with the observer on it).
  this._watching = (value === undefined);

  if (this._watching) {
    this._object = parent.value();
    addChainWatcher(this._object, this._key, this);
  }

  // Special-case: the EachProxy relies on immediate evaluation to
  // establish its observers.
  //
  // TODO: Replace this with an efficient callback that the EachProxy
  // can implement.
  if (this._parent && this._parent._key === '@each') {
    this.value();
  }
}

ChainNode.prototype = {
  value() {
    if (this._value === undefined && this._watching) {
      var obj = this._parent.value();
      this._value = lazyGet(obj, this._key);
    }
    return this._value;
  },

  destroy() {
    if (this._watching) {
      removeChainWatcher(this._object, this._key, this);
      this._watching = false; // so future calls do nothing
    }
  },

  // Create a new, top-level ChainNode and copy this ChainNodes's paths
  // into it. This only works with top level chain nodes.
  copy(obj) {
    var chainNode = new ChainNode(null, null, obj);

    for (var path in this._paths) {
      if (this._paths[path] > 0) {
        chainNode.add(path);
      }
    }
    return chainNode;
  },

  // This method is called on the root node of a chain to setup watchers on the
  // specified path.
  add(path) {
    var obj, key, src, normalizedObject, normalizedPath;

    this._paths[path] = (this._paths[path] || 0) + 1;

    obj = this.value();
    [normalizedObject, normalizedPath] = normalizeTuple(obj, path);

    if (normalizedObject) {
      // The path is a local path.
      if (normalizedObject === obj) {
        key  = firstKey(normalizedPath);
        path = normalizedPath.slice(key.length + 1);

        this.chain(key, path);

      // global path, and object already exists
      } else {
        src  = normalizedObject;
        key  = path.slice(0, -(normalizedPath.length + 1));
        path = normalizedPath;

        this.chain(key, path, src);
      }

    // global path, but object does not exist yet.
    // put into a queue and try to connect later.
    } else {
      pendingQueue.push([this, path]);
    }
  },

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path) {
    var obj, key, normalizedObject, normalizedPath;

    if (this._paths[path] > 0) {
      this._paths[path]--;
    }

    obj = this.value();
    [normalizedObject, normalizedPath] = normalizeTuple(obj, path);

    if (normalizedObject === obj) {
      key  = firstKey(normalizedPath);
      path = normalizedPath.slice(key.length + 1);
    } else {
      key  = path.slice(0, -(normalizedPath.length + 1));
      path = normalizedPath;
    }

    this.unchain(key, path);
  },

  chain(key, path, src) {
    var node;

    if (!this._chains) {
      this._chains = {};
    }

    if (!this._chains[key]) {
      this._chains[key] = new ChainNode(this, key, src);
    }

    node = this._chains[key];
    node.count++; // count chains

    // chain rest of path if there is one
    if (path) {
      key = firstKey(path);
      path = path.slice(key.length + 1);
      node.chain(key, path); // No src means the ChainNode will observe changes.
    }
  },

  unchain(key, path) {
    var node = this._chains[key];

    // Unchain rest of path first
    if (path && path.length > 1) {
      var nextKey  = firstKey(path);
      var nextPath = path.slice(nextKey.length + 1);
      node.unchain(nextKey, nextPath);
    }

    // Delete node if it has no other nodes chained to it.
    node.count--;
    if (node.count <= 0) {
      delete this._chains[node._key];
      node.destroy();
    }
  },

  willChange(events) {
    if (this._chains) {
      for (var key in this._chains) {
        if (this._chains.hasOwnProperty(key)) {
          this._chains[key].willChange(events);
        }
      }
    }

    if (this._parent) {
      this._parent.notify(this, this._key, 1, events);
    }
  },

  didChange(events) {
    // invalidate my own value first.
    if (this._watching) {
      var currentObject = this._parent.value();
      if (currentObject !== this._object) {
        removeChainWatcher(this._object, this._key, this);
        this._object = currentObject;
        addChainWatcher(currentObject, this._key, this);
      }
      this._value = undefined;

      // Special-case: the EachProxy relies on immediate evaluation to
      // establish its observers.
      if (this._parent && this._parent._key === '@each') {
        this.value();
      }
    }

    // Then notify chains
    for (var key in this._chains) {
      if (this._chains.hasOwnProperty(key)) {
        this._chains[key].didChange(events);
      }
    }

    // If events were passed in and there is a parent, we tell the parent about
    // my changing path
    if (events && this._parent) {
      this._parent.notify(this, this._key, 1, events);
    }
  },

  notify(chain, path, depth, events) {
    if (this._key) {
      path = this._key + '.' + path;
    }

    if (this._parent) {
      this._parent.notify(this, path, depth + 1, events);
    } else {
      if (depth > 1) {
        events.push(this.value(), path);
      }

      path = 'this.' + path;
      if (this._paths[path] > 0) {
        events.push(this.value(), path);
      }
    }
  }
};

// attempts to add the pendingQueue chains again. If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try
// again.
export function flushPendingChains() {
  if (pendingQueue.length === 0) {
    return;
  }

  var queue = pendingQueue;
  pendingQueue = [];

  forEach.call(queue, (q) => {
    q[0].add(q[1]);
  });

  warn('Watching an undefined global, Ember expects watched globals to be' +
       ' setup by the time the run loop is flushed, check for typos', pendingQueue.length === 0);
}

export function finishChains(obj) {
  var chains, chainWatchers, chainNodes;

  // We only create meta if we really have to
  var meta = obj['__ember_meta__'];

  if (!meta) {
    return;
  }

  // finish any current chains node watchers that reference obj
  chainWatchers = meta.chainWatchers;

  for (var key in chainWatchers) {
    if (chainWatchers.hasOwnProperty(key) && chainWatchers[key]) {
      chainNodes = chainWatchers[key];

      for (var i = 0; i < chainNodes.length; i++) {
        chainNodes[i].didChange(null);
      }
    }
  }

  // copy chains from prototype
  chains = meta.chains;
  if (chains && chains.value() !== obj) {
    metaFor(obj).chains = chains.copy(obj);
  }
}

export {
  removeChainWatcher,
  ChainNode
};
