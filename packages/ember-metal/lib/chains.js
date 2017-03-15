import { get } from './property_get';
import { meta as metaFor, peekMeta } from './meta';
import { watchKey, unwatchKey } from './watch_key';
import { cacheFor } from './computed';

const FIRST_KEY = /^([^\.]+)/;

function firstKey(path) {
  return path.match(FIRST_KEY)[0];
}

function isObject(obj) {
  return typeof obj === 'object' && obj;
}

function isVolatile(obj) {
  return !(isObject(obj) && obj.isDescriptor && obj._volatile === false);
}

class ChainWatchers {
  constructor() {
    // chain nodes that reference a key in this obj by key
    // we only create ChainWatchers when we are going to add them
    // so create this upfront
    this.chains = Object.create(null);
  }

  add(key, node) {
    let nodes = this.chains[key];
    if (nodes === undefined) {
      this.chains[key] = [node];
    } else {
      nodes.push(node);
    }
  }

  remove(key, node) {
    let nodes = this.chains[key];
    if (nodes) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) {
          nodes.splice(i, 1);
          break;
        }
      }
    }
  }

  has(key, node) {
    let nodes = this.chains[key];
    if (nodes) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === node) {
          return true;
        }
      }
    }
    return false;
  }

  revalidateAll() {
    for (let key in this.chains) {
      this.notify(key, true, undefined);
    }
  }

  revalidate(key) {
    this.notify(key, true, undefined);
  }

  // key: the string key that is part of a path changed
  // revalidate: boolean; the chains that are watching this value should revalidate
  // callback: function that will be called with the object and path that
  //           will be/are invalidated by this key change, depending on
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

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].notify(revalidate, affected);
    }

    if (callback === undefined) {
      return;
    }

    // we gather callbacks so we don't notify them during revalidation
    for (let i = 0; i < affected.length; i += 2) {
      let obj  = affected[i];
      let path = affected[i + 1];
      callback(obj, path);
    }
  }
}

function makeChainWatcher() {
  return new ChainWatchers();
}

function addChainWatcher(obj, keyName, node) {
  let m = metaFor(obj);
  m.writableChainWatchers(makeChainWatcher).add(keyName, node);
  watchKey(obj, keyName, m);
}

function removeChainWatcher(obj, keyName, node, _meta) {
  if (!isObject(obj)) {
    return;
  }

  let meta = _meta || peekMeta(obj);

  if (!meta || !meta.readableChainWatchers()) {
    return;
  }

  // make meta writable
  meta = metaFor(obj);

  meta.readableChainWatchers().remove(keyName, node);

  unwatchKey(obj, keyName, meta);
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
class ChainNode {
  constructor(parent, key, value) {
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
      let obj = parent.value();

      if (!isObject(obj)) {
        return;
      }

      this._object = obj;

      addChainWatcher(this._object, this._key, this);
    }
  }

  value() {
    if (this._value === undefined && this._watching) {
      let obj = this._parent.value();
      this._value = lazyGet(obj, this._key);
    }
    return this._value;
  }

  destroy() {
    if (this._watching) {
      let obj = this._object;
      if (obj) {
        removeChainWatcher(obj, this._key, this);
      }
      this._watching = false; // so future calls do nothing
    }
  }

  // copies a top level object only
  copy(obj) {
    let ret = new ChainNode(null, null, obj);
    let paths = this._paths;
    let path;

    for (path in paths) {
      // this check will also catch non-number vals.
      if (paths[path] <= 0) {
        continue;
      }
      ret.add(path);
    }
    return ret;
  }

  // called on the root node of a chain to setup watchers on the specified
  // path.
  add(path) {
    let paths = this._paths;
    paths[path] = (paths[path] || 0) + 1;

    let key = firstKey(path);
    let tail = path.slice(key.length + 1);

    this.chain(key, tail);
  }

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path) {
    let paths = this._paths;
    if (paths[path] > 0) {
      paths[path]--;
    }

    let key = firstKey(path);
    let tail = path.slice(key.length + 1);

    this.unchain(key, tail);
  }

  chain(key, path) {
    let chains = this._chains;
    let node;
    if (chains === undefined) {
      chains = this._chains = Object.create(null);
    } else {
      node = chains[key];
    }

    if (node === undefined) {
      node = chains[key] = new ChainNode(this, key, undefined);
    }

    node.count++; // count chains...

    // chain rest of path if there is one
    if (path) {
      key = firstKey(path);
      path = path.slice(key.length + 1);
      node.chain(key, path);
    }
  }

  unchain(key, path) {
    let chains = this._chains;
    let node = chains[key];

    // unchain rest of path first...
    if (path && path.length > 1) {
      let nextKey  = firstKey(path);
      let nextPath = path.slice(nextKey.length + 1);
      node.unchain(nextKey, nextPath);
    }

    // delete node if needed.
    node.count--;
    if (node.count <= 0) {
      chains[node._key] = undefined;
      node.destroy();
    }
  }

  notify(revalidate, affected) {
    if (revalidate && this._watching) {
      let parentValue = this._parent.value();

      if (parentValue !== this._object) {
        if (this._object) {
          removeChainWatcher(this._object, this._key, this);
        }

        if (isObject(parentValue)) {
          this._object = parentValue;
          addChainWatcher(parentValue, this._key, this);
        } else {
          this._object = undefined;
        }
      }
      this._value  = undefined;
    }

    // then notify chains...
    let chains = this._chains;
    let node;
    if (chains) {
      for (let key in chains) {
        node = chains[key];
        if (node !== undefined) {
          node.notify(revalidate, affected);
        }
      }
    }

    if (affected && this._parent) {
      this._parent.populateAffected(this._key, 1, affected);
    }
  }

  populateAffected(path, depth, affected) {
    if (this._key) {
      path = `${this._key}.${path}`;
    }

    if (this._parent) {
      this._parent.populateAffected(path, depth + 1, affected);
    } else {
      if (depth > 1) {
        affected.push(this.value(), path);
      }
    }
  }
}

function lazyGet(obj, key) {
  if (!isObject(obj)) {
    return;
  }

  let meta = peekMeta(obj);

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
    if (cache) {
      return cacheFor.get(cache, key);
    }
  }
}

import { makeChainNode } from './watch_path';

export function finishChains(obj) {
  // We only create meta if we really have to
  let m = peekMeta(obj);
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
      m.writableChains(makeChainNode);
    }
  }
}

export {
  removeChainWatcher,
  ChainNode
};
