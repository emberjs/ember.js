import { warn } from 'ember-metal/debug';
import { get, normalizeTuple } from 'ember-metal/property_get';
import { meta as metaFor } from 'ember-metal/meta';
import { watchKey, unwatchKey } from 'ember-metal/watch_key';
import EmptyObject from 'ember-metal/empty_object';

var FIRST_KEY = /^([^\.]+)/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

function isObject(obj) {
  return obj && (typeof obj === 'object');
}

function isVolatile(obj) {
  return !(isObject(obj) && obj.isDescriptor && obj._volatile === false);
}

function ChainWatchers(obj) {
  // this obj would be the referencing chain node's parent node's value
  this.obj = obj;
  // chain nodes that reference a key in this obj by key
  // we only create ChainWatchers when we are going to add them
  // so create this upfront
  this.chains = new EmptyObject();
}

ChainWatchers.prototype = {
  add(key, node) {
    let nodes = this.chains[key];
    if (nodes === undefined) {
      this.chains[key] = [node];
    } else {
      nodes.push(node);
    }
  },

  remove(key, node) {
    let nodes = this.chains[key];
    if (nodes) {
      for (var i = 0, l = nodes.length; i < l; i++) {
        if (nodes[i] === node) {
          nodes.splice(i, 1);
          break;
        }
      }
    }
  },

  has(key, node) {
    let nodes = this.chains[key];
    if (nodes) {
      for (var i = 0, l = nodes.length; i < l; i++) {
        if (nodes[i] === node) {
          return true;
        }
      }
    }
    return false;
  },

  revalidateAll() {
    for (let key in this.chains) {
      this.notify(key, true, undefined);
    }
  },

  revalidate(key) {
    this.notify(key, true, undefined);
  },

  // key: the string key that is part of a path changed
  // revalidate: boolean the chains that are watching this value should revalidate
  // callback: function that will be called with the the object and path that
  //           will be/are invalidated by this key change depending on the
  //           whether the revalidate flag is passed
  notify(key, revalidate, callback) {
    let nodes = this.chains[key];
    if (nodes === undefined || nodes.length === 0) {
      return;
    }

    let affected;

    if (callback) {
      affected = [];
    }

    for (let i = 0, l = nodes.length; i < l; i++) {
      nodes[i].notify(revalidate, affected);
    }

    if (callback === undefined) {
      return;
    }

    // we gather callbacks so we don't notify them during revalidation
    for (let i = 0, l = affected.length; i < l; i += 2) {
      let obj  = affected[i];
      let path = affected[i + 1];
      callback(obj, path);
    }
  }
};

var pendingQueue = [];

// attempts to add the pendingQueue chains again. If some of them end up
// back in the queue and reschedule is true, schedules a timeout to try
// again.
export function flushPendingChains() {
  if (pendingQueue.length === 0) {
    return;
  }

  var queue = pendingQueue;
  pendingQueue = [];

  queue.forEach((q) => q[0].add(q[1]));

  warn(
    'Watching an undefined global, Ember expects watched globals to be ' +
    'setup by the time the run loop is flushed, check for typos',
    pendingQueue.length === 0,
    { id: 'ember-metal.chains-flush-pending-chains' }
  );
}

function makeChainWatcher(obj) {
  return new ChainWatchers(obj);
}

function addChainWatcher(obj, keyName, node) {
  if (!isObject(obj)) {
    return;
  }

  let m = metaFor(obj);
  m.writableChainWatchers(makeChainWatcher).add(keyName, node);
  watchKey(obj, keyName, m);
}

function removeChainWatcher(obj, keyName, node) {
  if (!isObject(obj)) {
    return;
  }

  let m = obj.__ember_meta__;

  if (!m || !m.readableChainWatchers()) {
    return;
  }

  // make meta writable
  m = metaFor(obj);

  m.readableChainWatchers().remove(keyName, node);

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
  this._watching = (value === undefined);

  this._chains = undefined;
  this._object = undefined;
  this.count = 0;

  this._value = value;
  this._paths = {};
  if (this._watching) {
    this._object = parent.value();
    if (this._object) {
      addChainWatcher(this._object, this._key, this);
    }
  }
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

  // Use `get` if the return value is an EachProxy or an uncacheable value.
  if (isVolatile(obj[key])) {
    return get(obj, key);
  // Otherwise attempt to get the cached value of the computed property
  } else {
    let cache = meta.readableCache();
    if (cache && key in cache) {
      return cache[key];
    }
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
      var obj = this._object;
      if (obj) {
        removeChainWatcher(obj, this._key, this);
      }
      this._watching = false; // so future calls do nothing
    }
  },

  // copies a top level object only
  copy(obj) {
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
  },

  // called on the root node of a chain to setup watchers on the specified
  // path.
  add(path) {
    var obj, tuple, key, src, paths;

    paths = this._paths;
    paths[path] = (paths[path] || 0) + 1;

    obj = this.value();
    tuple = normalizeTuple(obj, path);

    // the path was a local path
    if (tuple[0] && tuple[0] === obj) {
      path = tuple[1];
      key  = firstKey(path);
      path = path.slice(key.length + 1);

    // global path, but object does not exist yet.
    // put into a queue and try to connect later.
    } else if (!tuple[0]) {
      pendingQueue.push([this, path]);
      tuple.length = 0;
      return;

    // global path, and object already exists
    } else {
      src  = tuple[0];
      key  = path.slice(0, 0 - (tuple[1].length + 1));
      path = tuple[1];
    }

    tuple.length = 0;
    this.chain(key, path, src);
  },

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path) {
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
      path = path.slice(key.length + 1);
    } else {
      src  = tuple[0];
      key  = path.slice(0, 0 - (tuple[1].length + 1));
      path = tuple[1];
    }

    tuple.length = 0;
    this.unchain(key, path);
  },

  chain(key, path, src) {
    var chains = this._chains;
    var node;
    if (chains === undefined) {
      chains = this._chains = new EmptyObject();
    } else {
      node = chains[key];
    }

    if (node === undefined) {
      node = chains[key] = new ChainNode(this, key, src);
    }

    node.count++; // count chains...

    // chain rest of path if there is one
    if (path) {
      key = firstKey(path);
      path = path.slice(key.length + 1);
      node.chain(key, path); // NOTE: no src means it will observe changes...
    }
  },

  unchain(key, path) {
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
    if (node.count <= 0) {
      chains[node._key] = undefined;
      node.destroy();
    }
  },

  notify(revalidate, affected) {
    if (revalidate && this._watching) {
      var obj = this._parent.value();
      if (obj !== this._object) {
        removeChainWatcher(this._object, this._key, this);
        this._object = obj;
        addChainWatcher(obj, this._key, this);
      }
      this._value  = undefined;
    }

    // then notify chains...
    var chains = this._chains;
    var node;
    if (chains) {
      for (var key in chains) {
        node = chains[key];
        if (node !== undefined) {
          node.notify(revalidate, affected);
        }
      }
    }

    if (affected && this._parent) {
      this._parent.populateAffected(this, this._key, 1, affected);
    }
  },

  populateAffected(chain, path, depth, affected) {
    if (this._key) {
      path = this._key + '.' + path;
    }

    if (this._parent) {
      this._parent.populateAffected(this, path, depth + 1, affected);
    } else {
      if (depth > 1) {
        affected.push(this.value(), path);
      }
      path = 'this.' + path;
      if (this._paths[path] > 0) {
        affected.push(this.value(), path);
      }
    }
  }
};

export function finishChains(obj) {
  // We only create meta if we really have to
  let m = obj.__ember_meta__;
  if (m) {
    m = metaFor(obj);

    // finish any current chains node watchers that reference obj
    let chainWatchers = m.readableChainWatchers();
    if (chainWatchers) {
      chainWatchers.revalidateAll();
    }
    // ensure that if we have inherited any chains they have been
    // copied onto our own meta.
    if (m.readableChains()) {
      m.writableChains();
    }
  }
}

export {
  removeChainWatcher,
  ChainNode
};
