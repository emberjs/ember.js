import { descriptorFor, meta as metaFor, peekMeta } from 'ember-meta';
import { getCachedValueFor } from './computed';
import { eachProxyFor } from './each_proxy';
import { get } from './property_get';
import { unwatchKey, watchKey } from './watch_key';

function isObject(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isVolatile(obj, keyName, meta) {
  let desc = descriptorFor(obj, keyName, meta);
  return !(desc !== undefined && desc._volatile === false);
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
    if (nodes !== undefined) {
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
    if (nodes !== undefined) {
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
      let obj = affected[i];
      let path = affected[i + 1];
      callback(obj, path);
    }
  }
}

function makeChainWatcher() {
  return new ChainWatchers();
}

function makeChainNode(obj) {
  return new ChainNode(null, null, obj);
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

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (
    meta === undefined ||
    meta.isSourceDestroying() ||
    meta.isMetaDestroyed() ||
    meta.readableChainWatchers() === undefined
  ) {
    return;
  }

  // make meta writable
  meta = metaFor(obj);

  meta.readableChainWatchers().remove(keyName, node);

  unwatchKey(obj, keyName, meta);
}

const NODE_STACK = [];
function destroyRoot(root) {
  pushChildren(root);
  while (NODE_STACK.length > 0) {
    let node = NODE_STACK.pop();
    pushChildren(node);
    destroyOne(node);
  }
}

function destroyOne(node) {
  if (node._isWatching) {
    removeChainWatcher(node._object, node._key, node);
    node._isWatching = false;
  }
}

function pushChildren(node) {
  let nodes = node._chains;
  if (nodes !== undefined) {
    for (let key in nodes) {
      if (nodes[key] !== undefined) {
        NODE_STACK.push(nodes[key]);
      }
    }
  }
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
class ChainNode {
  constructor(parent, key, value) {
    this._parent = parent;
    this._key = key;

    this._chains = undefined;
    this._object = undefined;
    this.count = 0;

    this._value = value;
    this._paths = undefined;

    // It is false for the root of a chain (because we have no parent)
    let isWatching = parent !== null;
    let object;
    if (isWatching) {
      let parentValue = parent.value();
      if (isObject(parentValue)) {
        object = parentValue;
      }
    }

    this._isWatching = isWatching;
    this._object = object;

    if (isWatching && object !== undefined) {
      addChainWatcher(object, key, this);
    }
  }

  value() {
    if (this._value === undefined && this._isWatching) {
      let obj = this._parent.value();
      this._value = lazyGet(obj, this._key);
    }
    return this._value;
  }

  destroy() {
    // check if root
    if (this._parent === null) {
      destroyRoot(this);
    } else {
      destroyOne(this);
    }
  }

  // copies a top level object only
  copy(obj) {
    let ret = makeChainNode(obj);
    let paths = this._paths;
    if (paths !== undefined) {
      let path;
      for (path in paths) {
        if (paths[path] > 0) {
          ret.add(path);
        }
      }
    }
    return ret;
  }

  // called on the root node of a chain to setup watchers on the specified
  // path.
  add(path) {
    let paths = this._paths || (this._paths = {});
    paths[path] = (paths[path] || 0) + 1;

    let tails = path.split('.');
    this.chain(tails.shift(), tails);
  }

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path) {
    let paths = this._paths;
    if (paths === undefined) {
      return;
    }
    if (paths[path] > 0) {
      paths[path]--;
    }

    let tails = path.split('.');
    this.unchain(tails.shift(), tails);
  }

  chain(key, tails) {
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
    if (tails.length > 0) {
      node.chain(tails.shift(), tails);
    }
  }

  unchain(key, tails) {
    let chains = this._chains;
    let node = chains[key];

    // unchain rest of path first...
    if (tails.length > 0) {
      node.unchain(tails.shift(), tails);
    }

    // delete node if needed.
    node.count--;
    if (node.count <= 0) {
      chains[node._key] = undefined;
      node.destroy();
    }
  }

  notify(revalidate, affected) {
    if (revalidate && this._isWatching) {
      let parentValue = this._parent.value();

      if (parentValue !== this._object) {
        removeChainWatcher(this._object, this._key, this);

        if (isObject(parentValue)) {
          this._object = parentValue;
          addChainWatcher(parentValue, this._key, this);
        } else {
          this._object = undefined;
        }
      }
      this._value = undefined;
    }

    // then notify chains...
    let chains = this._chains;
    if (chains !== undefined) {
      let node;
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
    } else if (depth > 1) {
      affected.push(this.value(), path);
    }
  }
}

function lazyGet(obj, key) {
  if (!isObject(obj)) {
    return;
  }

  let meta = peekMeta(obj);

  // check if object meant only to be a prototype
  if (meta !== undefined && meta.proto === obj) {
    return;
  }

  // Use `get` if the return value is an EachProxy or an uncacheable value.
  if (key === '@each') {
    return eachProxyFor(obj);
  } else if (isVolatile(obj, key, meta)) {
    return get(obj, key);
    // Otherwise attempt to get the cached value of the computed property
  } else {
    return getCachedValueFor(obj, key);
  }
}

function finishChains(meta) {
  // finish any current chains node watchers that reference obj
  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers !== undefined) {
    chainWatchers.revalidateAll();
  }
  // ensure that if we have inherited any chains they have been
  // copied onto our own meta.
  if (meta.readableChains() !== undefined) {
    meta.writableChains(makeChainNode);
  }
}

export { finishChains, makeChainNode, removeChainWatcher, ChainNode };
