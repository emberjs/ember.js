import {
  lookupDescriptor,
  symbol,
  toString
} from 'ember-utils';
import { protoMethods as listenerMethods } from './meta_listeners';
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { MANDATORY_SETTER } from 'ember/features';
import {
  removeChainWatcher
} from './chains';

let counters;
if (DEBUG) {
  counters = {
    peekCalls: 0,
    peekParentCalls: 0,
    peekPrototypeWalks: 0,
    setCalls: 0,
    deleteCalls: 0,
    metaCalls: 0,
    metaInstantiated: 0
  };
}

/**
@module ember
*/

export const UNDEFINED = symbol('undefined');

// FLAGS
const SOURCE_DESTROYING = 1 << 1;
const SOURCE_DESTROYED = 1 << 2;
const META_DESTROYED = 1 << 3;
const IS_PROXY = 1 << 4;

const META_FIELD = '__ember_meta__';
const NODE_STACK = [];

export class Meta {
  constructor(obj, parentMeta) {
    if (DEBUG) {
      counters.metaInstantiated++;
    }

    this._cache = undefined;
    this._watching = undefined;
    this._mixins = undefined;
    this._bindings = undefined;
    this._values = undefined;
    this._deps = undefined;
    this._chainWatchers = undefined;
    this._chains = undefined;
    this._tag = undefined;
    this._tags = undefined;
    this._factory = undefined;

    // initial value for all flags right now is false
    // see FLAGS const for detailed list of flags used
    this._flags = 0;

    // used only internally
    this.source = obj;

    // when meta(obj).proto === obj, the object is intended to be only a
    // prototype and doesn't need to actually be observable itself
    this.proto = undefined;

    // The next meta in our inheritance chain. We (will) track this
    // explicitly instead of using prototypical inheritance because we
    // have detailed knowledge of how each property should really be
    // inherited, and we can optimize it much better than JS runtimes.
    this.parent = parentMeta;

    this._listeners = undefined;
    this._listenersFinalized = false;
    this._suspendedListeners = undefined;
  }

  isInitialized(obj) {
    return this.proto !== obj;
  }

  destroy() {
    if (this.isMetaDestroyed()) { return; }

    // remove chainWatchers to remove circular references that would prevent GC
    let nodes, key, nodeObject;
    let node = this.readableChains();
    if (node !== undefined) {
      NODE_STACK.push(node);
      // process tree
      while (NODE_STACK.length > 0) {
        node = NODE_STACK.pop();
        // push children
        nodes = node._chains;
        if (nodes !== undefined) {
          for (key in nodes) {
            if (nodes[key] !== undefined) {
              NODE_STACK.push(nodes[key]);
            }
          }
        }

        // remove chainWatcher in node object
        if (node._watching) {
          nodeObject = node._object;
          if (nodeObject !== undefined) {
            let foreignMeta = peekMeta(nodeObject);
            // avoid cleaning up chain watchers when both current and
            // foreign objects are being destroyed
            // if both are being destroyed manual cleanup is not needed
            // as they will be GC'ed and no non-destroyed references will
            // be remaining
            if (foreignMeta && !foreignMeta.isSourceDestroying()) {
              removeChainWatcher(nodeObject, node._key, node, foreignMeta);
            }
          }
        }
      }
    }

    this.setMetaDestroyed();
  }

  isSourceDestroying() {
    return (this._flags & SOURCE_DESTROYING) !== 0;
  }

  setSourceDestroying() {
    this._flags |= SOURCE_DESTROYING;
  }

  isSourceDestroyed() {
    return (this._flags & SOURCE_DESTROYED) !== 0;
  }

  setSourceDestroyed() {
    this._flags |= SOURCE_DESTROYED;
  }

  isMetaDestroyed() {
    return (this._flags & META_DESTROYED) !== 0;
  }

  setMetaDestroyed() {
    this._flags |= META_DESTROYED;
  }

  isProxy() {
    return (this._flags & IS_PROXY) !== 0;
  }

  setProxy() {
    this._flags |= IS_PROXY;
  }

  _getOrCreateOwnMap(key) {
    return this[key] || (this[key] = Object.create(null));
  }

  _forEachInherited() {
    let pointer = this;
    let keys = arguments;
    let len = keys.length - 1;
    let callback = arguments[len];
    let value, key, i;
    let seen = Object.create(null);

    while (pointer !== undefined) {
      value = pointer;
      i = 0;
      for (; i < len; i++) {
        key = keys[i];
        value = value[key];
        if (value === undefined) {
          break;
        }
      }

      if (i === len) {
        for (let innerKey in value) {
          if (seen[innerKey] === undefined) {
            seen[innerKey] = true;
            callback(innerKey, value[innerKey]);
          }
        }
      }

      pointer = pointer.parent;
    }
  }

  _findInherited() {
    let pointer = this;
    let keys = arguments;
    let len = keys.length;
    let value, key, i;

    while (pointer !== undefined) {
      value = pointer;
      i = 0;
      for (; i < len; i++) {
        key = keys[i];
        value = value[key];
        if (value === undefined) {
          break;
        }
      }
      if (i === len) { return value; }
      pointer = pointer.parent;
    }
  }

  // Implements a member that provides a lazily created map of maps,
  // with inheritance at both levels.
  writeDeps(subkey, itemkey, value) {
    assert(`Cannot modify dependent keys for \`${itemkey}\` on \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());

    let outerMap = this._getOrCreateOwnMap('_deps');
    let innerMap = outerMap[subkey];
    if (innerMap === undefined) {
      innerMap = outerMap[subkey] = Object.create(null);
    }
    innerMap[itemkey] = value;
  }

  peekDeps(subkey, itemkey) {
    return this._findInherited('_deps', subkey, itemkey);
  }

  hasDeps(subkey) {
    return this._findInherited('_deps', subkey) !== undefined;
  }

  forEachInDeps(subkey, fn) {
    return this._forEachInherited('_deps', subkey, fn);
  }

  set factory(factory) {
    this._factory = factory;
  }

  get factory() {
    return this._factory;
  }

  writableCache() { return this._getOrCreateOwnMap('_cache'); }
  readableCache() { return this._cache; }

  writableTags() { return this._getOrCreateOwnMap('_tags'); }
  readableTags() { return this._tags; }

  writableTag(create) {
    assert(`Cannot create a new tag for \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());
    let ret = this._tag;
    if (ret === undefined) {
      ret = this._tag = create(this.source);
    }
    return ret;
  }

  readableTag() {
    return this._tag;
  }

  writableChainWatchers(create) {
    assert(`Cannot create a new chain watcher for \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());
    let ret = this._chainWatchers;
    if (ret === undefined) {
      ret = this._chainWatchers = create(this.source);
    }
    return ret;
  }

  readableChainWatchers() {
    return this._chainWatchers;
  }

  writableChains(create) {
    assert(`Cannot create a new chains for \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());
    let ret = this._chains;
    if (ret === undefined) {
      if (this.parent === undefined) {
        ret = create(this.source);
      } else {
        ret = this.parent.writableChains(create).copy(this.source);
      }
      this._chains = ret;
    }
    return ret;
  }

  readableChains() {
    return this._findInherited('_chains');
  }

  writeWatching(subkey, value) {
    assert(`Cannot update watchers for \`${subkey}\` on \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());
    let map = this._getOrCreateOwnMap('_watching');
    map[subkey] = value;
  }

  peekWatching(subkey) {
    return this._findInherited('_watching', subkey);
  }

  writeMixins(subkey, value) {
    assert(`Cannot add mixins for \`${subkey}\` on \`${toString(this.source)}\` call writeMixins after it has been destroyed.`, !this.isMetaDestroyed());
    let map = this._getOrCreateOwnMap('_mixins');
    map[subkey] = value;
  }

  peekMixins(subkey) {
    return this._findInherited('_mixins', subkey);
  }

  forEachMixins(fn) {
    return this._forEachInherited('_mixins', fn);
  }

  writeBindings(subkey, value) {
    assert(`Cannot add a binding for \`${subkey}\` on \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());

    let map = this._getOrCreateOwnMap('_bindings');
    map[subkey] = value;
  }

  peekBindings(subkey) {
    return this._findInherited('_bindings', subkey);
  }

  forEachBindings(fn) {
    return this._forEachInherited('_bindings', fn);
  }

  clearBindings() {
    assert(`Cannot clear bindings on \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());
    this._bindings = undefined;
  }

  writeValues(subkey, value) {
    assert(`Cannot set the value of \`${subkey}\` on \`${toString(this.source)}\` after it has been destroyed.`, !this.isMetaDestroyed());

    let map = this._getOrCreateOwnMap('_values');
    map[subkey] = value;
  }

  peekValues(subkey) {
    return this._findInherited('_values', subkey);
  }

  deleteFromValues(subkey) {
    delete this._getOrCreateOwnMap('_values')[subkey];
  }
}

for (let name in listenerMethods) {
  Meta.prototype[name] = listenerMethods[name];
}

export const META_DESC = {
  writable: true,
  configurable: true,
  enumerable: false,
  value: null
};

const EMBER_META_PROPERTY = {
  name: META_FIELD,
  descriptor: META_DESC
};

if (MANDATORY_SETTER) {
  Meta.prototype.readInheritedValue = function(key, subkey) {
    let internalKey = `_${key}`;

    let pointer = this;

    while (pointer !== undefined) {
      let map = pointer[internalKey];
      if (map !== undefined) {
        let value = map[subkey];
        if (value !== undefined || subkey in map) {
          return value;
        }
      }
      pointer = pointer.parent;
    }

    return UNDEFINED;
  };

  Meta.prototype.writeValue = function(obj, key, value) {
    let descriptor = lookupDescriptor(obj, key);
    let isMandatorySetter = descriptor !== null && descriptor.set && descriptor.set.isMandatorySetter;

    if (isMandatorySetter) {
      this.writeValues(key, value);
    } else {
      obj[key] = value;
    }
  };
}


let getPrototypeOf = Object.getPrototypeOf;
let metaStore = new WeakMap();

export function setMeta(obj, meta) {
  if (DEBUG) {
    counters.setCalls++;
  }
  metaStore.set(obj, meta);
}

export function peekMeta(obj) {
  let pointer = obj;
  let meta;
  while (pointer !== undefined && pointer !== null) {
    meta = metaStore.get(pointer);
    // jshint loopfunc:true
    if (DEBUG) {
      counters.peekCalls++;
    }
    if (meta !== undefined) {
      return meta;
    }

    pointer = getPrototypeOf(pointer);
    if (DEBUG) {
      counters.peekPrototypeWalks++;
    }
  }
}

/**
  Tears down the meta on an object so that it can be garbage collected.
  Multiple calls will have no effect.

  @method deleteMeta
  @for Ember
  @param {Object} obj  the object to destroy
  @return {void}
  @private
*/
export function deleteMeta(obj) {
  if (DEBUG) {
    counters.deleteCalls++;
  }

  let meta = peekMeta(obj);
  if (meta !== undefined) {
    meta.destroy();
  }
}

/**
  Retrieves the meta hash for an object. If `writable` is true ensures the
  hash is writable for this object as well.

  The meta object contains information about computed property descriptors as
  well as any watched properties and other information. You generally will
  not access this information directly but instead work with higher level
  methods that manipulate this hash indirectly.

  @method meta
  @for Ember
  @private

  @param {Object} obj The object to retrieve meta for
  @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
    the meta hash, allowing the method to avoid making an unnecessary copy.
  @return {Object} the meta hash for an object
*/
export function meta(obj) {
  if (DEBUG) {
    counters.metaCalls++;
  }

  let maybeMeta = peekMeta(obj);
  let parent;

  // remove this code, in-favor of explicit parent
  if (maybeMeta !== undefined) {
    if (maybeMeta.source === obj) {
      return maybeMeta;
    }
    parent = maybeMeta;
  }

  let newMeta = new Meta(obj, parent);
  setMeta(obj, newMeta);
  return newMeta;
}

export { counters };
