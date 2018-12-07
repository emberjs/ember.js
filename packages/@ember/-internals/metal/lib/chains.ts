import { descriptorFor, Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { getCachedValueFor } from './computed_cache';
import { eachProxyFor } from './each_proxy';
import { get } from './property_get';
import { unwatchKey, watchKey } from './watch_key';

function isObject(obj: any): obj is object {
  return typeof obj === 'object' && obj !== null;
}

function isVolatile(obj: any, keyName: string, meta?: Meta): boolean {
  let desc = descriptorFor(obj, keyName, meta);
  return !(desc !== undefined && desc._volatile === false);
}

class ChainWatchers {
  // chain nodes that reference a key in this obj by key
  // we only create ChainWatchers when we are going to add them
  // so create this upfront
  chains: { [key: string]: ChainNode[] } = Object.create(null);

  add(key: string, node: ChainNode): void {
    let nodes = this.chains[key];
    if (nodes === undefined) {
      this.chains[key] = [node];
    } else {
      nodes.push(node);
    }
  }

  remove(key: string, node: ChainNode): void {
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

  has(key: string, node: ChainNode): boolean {
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

  revalidateAll(): void {
    for (let key in this.chains) {
      this.notify(key, true, undefined);
    }
  }

  revalidate(key: string): void {
    this.notify(key, true, undefined);
  }

  // key: the string key that is part of a path changed
  // revalidate: boolean; the chains that are watching this value should revalidate
  // callback: function that will be called with the object and path that
  //           will be/are invalidated by this key change, depending on
  //           whether the revalidate flag is passed
  notify(key: string, revalidate: boolean, callback?: (obj: object, path: string) => void): void {
    let nodes = this.chains[key];
    if (nodes === undefined || nodes.length === 0) {
      return;
    }

    let affected: (any | string)[] | undefined = undefined;
    if (callback !== undefined) {
      affected = [];
    }

    for (let i = 0; i < nodes.length; i++) {
      nodes[i].notify(revalidate, affected);
    }

    if (callback === undefined) {
      return;
    }

    // we gather callbacks so we don't notify them during revalidation
    for (let i = 0; i < affected!.length; i += 2) {
      let obj = affected![i];
      let path = affected![i + 1];
      callback(obj, path);
    }
  }
}

function makeChainWatcher(): ChainWatchers {
  return new ChainWatchers();
}

function makeChainNode(obj: any): ChainNode {
  return new ChainNode(null, null as any, obj);
}

function addChainWatcher(obj: object, keyName: string, node: ChainNode): void {
  let m = metaFor(obj);
  m.writableChainWatchers(makeChainWatcher).add(keyName, node);
  watchKey(obj, keyName, m);
}

function removeChainWatcher(obj: object, keyName: string, node: ChainNode, _meta?: Meta): void {
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

const NODE_STACK: ChainNode[] = [];
function destroyRoot(root: ChainNode): void {
  pushChildren(root);
  while (NODE_STACK.length > 0) {
    let node = NODE_STACK.pop()!;
    pushChildren(node);
    destroyOne(node);
  }
}

function destroyOne(node: ChainNode): void {
  if (node.isWatching) {
    removeChainWatcher(node.object!, node.key, node);
    node.isWatching = false;
  }
}

function pushChildren(node: ChainNode): void {
  let nodes = node.chains;
  if (nodes !== undefined) {
    for (let key in nodes) {
      if (nodes[key] !== undefined) {
        NODE_STACK.push(nodes[key]!);
      }
    }
  }
}

// A ChainNode watches a single key on an object. If you provide a starting
// value for the key then the node won't actually watch it. For a root node
// pass null for parent and key and object for value.
class ChainNode {
  private readonly parent: ChainNode | null;
  private paths: { [key: string]: number } | undefined = undefined;
  private content: any;
  readonly key: string;
  isWatching = false;
  chains: { [key: string]: ChainNode | undefined } | undefined = undefined;
  object: object | undefined = undefined;
  count = 0;

  constructor(parent: ChainNode | null, key: string, value: any) {
    this.parent = parent;
    this.key = key;
    this.content = value;

    // It is false for the root of a chain (because we have no parent)
    let isWatching = (this.isWatching = parent !== null);
    if (isWatching) {
      let parentValue = parent!.value();
      if (isObject(parentValue)) {
        this.object = parentValue;
        addChainWatcher(parentValue, key, this);
      }
    }
  }

  value(): any {
    if (this.content === undefined && this.isWatching) {
      let obj = this.parent!.value();
      this.content = lazyGet(obj, this.key);
    }
    return this.content;
  }

  destroy(): void {
    // check if root
    if (this.parent === null) {
      destroyRoot(this);
    } else {
      destroyOne(this);
    }
  }

  // copies a top level object only
  copyTo(target: ChainNode): void {
    let paths = this.paths;
    if (paths !== undefined) {
      let path;
      for (path in paths) {
        if (paths[path] > 0) {
          target.add(path);
        }
      }
    }
  }

  // called on the root node of a chain to setup watchers on the specified
  // path.
  add(path: string): void {
    let paths = this.paths || (this.paths = {});
    paths[path] = (paths[path] || 0) + 1;

    let tails = path.split('.');
    this.chain(tails.shift()!, tails);
  }

  // called on the root node of a chain to teardown watcher on the specified
  // path
  remove(path: string): void {
    let paths = this.paths;
    if (paths === undefined) {
      return;
    }
    if (paths[path] > 0) {
      paths[path]--;
    }

    let tails = path.split('.');
    this.unchain(tails.shift()!, tails);
  }

  chain(key: string, tails: string[]): void {
    let chains = this.chains;
    if (chains === undefined) {
      chains = this.chains = Object.create(null);
    }

    let node = chains![key];
    if (node === undefined) {
      node = chains![key] = new ChainNode(this, key, undefined);
    }

    node.count++; // count chains...

    // chain rest of path if there is one
    if (tails.length > 0) {
      node.chain(tails.shift()!, tails);
    }
  }

  unchain(key: string, tails: string[]): void {
    let chains = this.chains!;
    let node = chains[key]!;

    // unchain rest of path first...
    if (tails.length > 0) {
      node.unchain(tails.shift()!, tails);
    }

    // delete node if needed.
    node.count--;
    if (node.count <= 0) {
      chains[node.key] = undefined;
      node.destroy();
    }
  }

  notify(revalidate: boolean, affected?: (any | string)[]): void {
    if (revalidate && this.isWatching) {
      let parentValue = this.parent!.value();

      if (parentValue !== this.object) {
        removeChainWatcher(this.object!, this.key, this);

        if (isObject(parentValue)) {
          this.object = parentValue;
          addChainWatcher(parentValue, this.key, this);
        } else {
          this.object = undefined;
        }
      }
      this.content = undefined;
    }

    // then notify chains...
    let chains = this.chains;
    if (chains !== undefined) {
      let node;
      for (let key in chains) {
        node = chains[key];
        if (node !== undefined) {
          node.notify(revalidate, affected);
        }
      }
    }

    if (affected !== undefined && this.parent !== null) {
      this.parent.populateAffected(this.key, 1, affected);
    }
  }

  populateAffected(path: string, depth: number, affected: (any | string)[]): void {
    if (this.key) {
      path = `${this.key}.${path}`;
    }

    if (this.parent !== null) {
      this.parent.populateAffected(path, depth + 1, affected);
    } else if (depth > 1) {
      affected.push(this.value(), path);
    }
  }
}

function lazyGet(obj: object, key: string): any {
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
    return eachProxyFor(obj as any[]);
  } else if (isVolatile(obj, key, meta)) {
    return get(obj, key);
    // Otherwise attempt to get the cached value of the computed property
  } else {
    return getCachedValueFor(obj, key);
  }
}

function finishChains(meta: Meta): void {
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
