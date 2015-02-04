import Ember from "ember-metal/core"; // warn, assert, etc;
import {get, normalizeTuple} from "ember-metal/property_get";
import {meta as metaFor} from "ember-metal/utils";
import {forEach} from "ember-metal/array";
import {watchKey, unwatchKey} from "ember-metal/watch_key";

var warn = Ember.warn;
var FIRST_KEY = /^([^\.]+)/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

var pendingQueue = [];

// attempts to add the pendingQueue chains again. If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try
// again.
export function flushPendingChains() {
  if (pendingQueue.length === 0) { return; } // nothing to do

  var queue = pendingQueue;
  pendingQueue = [];

  forEach.call(queue, function(q) {
    q[0].add(q[1]);
  });

  warn('Watching an undefined global, Ember expects watched globals to be' +
       ' setup by the time the run loop is flushed, check for typos', pendingQueue.length === 0);
}

function addChainWatcher(obj, keyName, node) {
  if (!obj || ('object' !== typeof obj)) { return; } // nothing to do

  var m = metaFor(obj);
  var nodes = m.chainWatchers;

  if (!m.hasOwnProperty('chainWatchers')) { // FIXME?!
    nodes = m.chainWatchers = {};
  }

  if (!nodes[keyName]) {
    nodes[keyName] = [];
  }
  nodes[keyName].push(node);
  watchKey(obj, keyName, m);
}

function removeChainWatcher(obj, keyName, node) {
  if (!obj || 'object' !== typeof obj) { return; } // nothing to do

  var m = obj['__ember_meta__'];
  if (m && !m.hasOwnProperty('chainWatchers')) { return; } // nothing to do

  var nodes = m && m.chainWatchers;

  if (nodes && nodes[keyName]) {
    nodes = nodes[keyName];
    for (var i = 0, l = nodes.length; i < l; i++) {
      if (nodes[i] === node) {
        nodes.splice(i, 1);
        break;
      }
    }
  }
  unwatchKey(obj, keyName, m);
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
function ChainNode(parent, key, value) {
  this._parent = parent;
  this._key    = key;

  // _watching is true when calling get(this._parent, this._key) will
  // return the value of this node.
  //
  // It is false for the root of a chain (because we have no parent)
  // and for global paths (because the parent node is the object with
  // the observer on it)
  this._watching = value===undefined;

  this._value  = value;
  this._paths = {};
  if (this._watching) {
    this._object = parent.value();
    if (this._object) {
      addChainWatcher(this._object, this._key, this);
    }
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

var ChainNodePrototype = ChainNode.prototype;

function lazyGet(obj, key) {
  if (!obj) {
    return undefined;
  }

  var meta = obj['__ember_meta__'];
  // check if object meant only to be a prototype
  if (meta && meta.proto === obj) {
    return undefined;
  }

  if (key === "@each") {
    return get(obj, key);
  }

  // if a CP only return cached value
  var possibleDesc = obj[key];
  var desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;
  if (desc && desc._cacheable) {
    if (meta.cache && key in meta.cache) {
      return meta.cache[key];
    } else {
      return undefined;
    }
  }

  return get(obj, key);
}

ChainNodePrototype.value = function() {
  if (this._value === undefined && this._watching) {
    var obj = this._parent.value();
    this._value = lazyGet(obj, this._key);
  }
  return this._value;
};

ChainNodePrototype.destroy = function() {
  if (this._watching) {
    var obj = this._object;
    if (obj) {
      removeChainWatcher(obj, this._key, this);
    }
    this._watching = false; // so future calls do nothing
  }
};

// copies a top level object only
ChainNodePrototype.copy = function(obj) {
  var ret = new ChainNode(null, null, obj);
  var paths = this._paths;
  var path;

  for (path in paths) {
    // this check will also catch non-number vals.
    if (paths[path] <= 0) {
      continue;
    }
    ret.add(path);
  }
  return ret;
};

// called on the root node of a chain to setup watchers on the specified
// path.
ChainNodePrototype.add = function(path) {
  var obj, tuple, key, src, paths;

  paths = this._paths;
  paths[path] = (paths[path] || 0) + 1;

  obj = this.value();
  tuple = normalizeTuple(obj, path);

  // the path was a local path
  if (tuple[0] && tuple[0] === obj) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);

  // global path, but object does not exist yet.
  // put into a queue and try to connect later.
  } else if (!tuple[0]) {
    pendingQueue.push([this, path]);
    tuple.length = 0;
    return;

  // global path, and object already exists
  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    path = tuple[1];
  }

  tuple.length = 0;
  this.chain(key, path, src);
};

// called on the root node of a chain to teardown watcher on the specified
// path
ChainNodePrototype.remove = function(path) {
  var obj, tuple, key, src, paths;

  paths = this._paths;
  if (paths[path] > 0) {
    paths[path]--;
  }

  obj = this.value();
  tuple = normalizeTuple(obj, path);
  if (tuple[0] === obj) {
    path = tuple[1];
    key  = firstKey(path);
    path = path.slice(key.length+1);
  } else {
    src  = tuple[0];
    key  = path.slice(0, 0-(tuple[1].length+1));
    path = tuple[1];
  }

  tuple.length = 0;
  this.unchain(key, path);
};

ChainNodePrototype.count = 0;

ChainNodePrototype.chain = function(key, path, src) {
  var chains = this._chains;
  var node;
  if (!chains) {
    chains = this._chains = {};
  }

  node = chains[key];
  if (!node) {
    node = chains[key] = new ChainNode(this, key, src);
  }
  node.count++; // count chains...

  // chain rest of path if there is one
  if (path) {
    key = firstKey(path);
    path = path.slice(key.length+1);
    node.chain(key, path); // NOTE: no src means it will observe changes...
  }
};

ChainNodePrototype.unchain = function(key, path) {
  var chains = this._chains;
  var node = chains[key];

  // unchain rest of path first...
  if (path && path.length > 1) {
    var nextKey  = firstKey(path);
    var nextPath = path.slice(nextKey.length + 1);
    node.unchain(nextKey, nextPath);
  }

  // delete node if needed.
  node.count--;
  if (node.count<=0) {
    delete chains[node._key];
    node.destroy();
  }

};

ChainNodePrototype.willChange = function(events) {
  var chains = this._chains;
  if (chains) {
    for (var key in chains) {
      if (!chains.hasOwnProperty(key)) {
        continue;
      }
      chains[key].willChange(events);
    }
  }

  if (this._parent) {
    this._parent.chainWillChange(this, this._key, 1, events);
  }
};

ChainNodePrototype.chainWillChange = function(chain, path, depth, events) {
  if (this._key) {
    path = this._key + '.' + path;
  }

  if (this._parent) {
    this._parent.chainWillChange(this, path, depth+1, events);
  } else {
    if (depth > 1) {
      events.push(this.value(), path);
    }
    path = 'this.' + path;
    if (this._paths[path] > 0) {
      events.push(this.value(), path);
    }
  }
};

ChainNodePrototype.chainDidChange = function(chain, path, depth, events) {
  if (this._key) {
    path = this._key + '.' + path;
  }

  if (this._parent) {
    this._parent.chainDidChange(this, path, depth+1, events);
  } else {
    if (depth > 1) {
      events.push(this.value(), path);
    }
    path = 'this.' + path;
    if (this._paths[path] > 0) {
      events.push(this.value(), path);
    }
  }
};

ChainNodePrototype.didChange = function(events) {
  // invalidate my own value first.
  if (this._watching) {
    var obj = this._parent.value();
    if (obj !== this._object) {
      removeChainWatcher(this._object, this._key, this);
      this._object = obj;
      addChainWatcher(obj, this._key, this);
    }
    this._value  = undefined;

    // Special-case: the EachProxy relies on immediate evaluation to
    // establish its observers.
    if (this._parent && this._parent._key === '@each') {
      this.value();
    }
  }

  // then notify chains...
  var chains = this._chains;
  if (chains) {
    for (var key in chains) {
      if (!chains.hasOwnProperty(key)) { continue; }
      chains[key].didChange(events);
    }
  }

  // if no events are passed in then we only care about the above wiring update
  if (events === null) {
    return;
  }

  // and finally tell parent about my path changing...
  if (this._parent) {
    this._parent.chainDidChange(this, this._key, 1, events);
  }
};

export function finishChains(obj) {
  // We only create meta if we really have to
  var m = obj['__ember_meta__'];
  var chains, chainWatchers, chainNodes;

  if (m) {
    // finish any current chains node watchers that reference obj
    chainWatchers = m.chainWatchers;
    if (chainWatchers) {
      for (var key in chainWatchers) {
        if (!chainWatchers.hasOwnProperty(key)) {
          continue;
        }

        chainNodes = chainWatchers[key];
        if (chainNodes) {
          for (var i=0,l=chainNodes.length;i<l;i++) {
            chainNodes[i].didChange(null);
          }
        }
      }
    }
    // copy chains from prototype
    chains = m.chains;
    if (chains && chains.value() !== obj) {
      metaFor(obj).chains = chains = chains.copy(obj);
    }
  }
}

export {
  removeChainWatcher,
  ChainNode
};
