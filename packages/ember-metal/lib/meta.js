import {
  HAS_NATIVE_WEAKMAP,
  lookupDescriptor,
  symbol
} from 'ember-utils';
import { protoMethods as listenerMethods } from './meta_listeners';
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER,
  EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER,
  MANDATORY_SETTER
} from 'ember/features';
import {
  removeChainWatcher
} from './chains';
import { has } from 'require';

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
@module ember-metal
*/

/*
 This declares several meta-programmed members on the Meta class. Such
 meta!

 In general, the `readable` variants will give you an object (if it
 already exists) that you can read but should not modify. The
 `writable` variants will give you a mutable object, and they will
 create it if it didn't already exist.

 The following methods will get generated metaprogrammatically, and
 I'm including them here for greppability:

 writableCache, readableCache, writeWatching,
 peekWatching, clearWatching, writeMixins,
 peekMixins, clearMixins, writeBindings,
 peekBindings, clearBindings, writeValues,
 peekValues, clearValues, writeDeps, forEachInDeps
 writableChainWatchers, readableChainWatchers, writableChains,
 readableChains, writableTag, readableTag, writableTags,
 readableTags
*/
let members = {
  cache: ownMap,
  weak: ownMap,
  watching: inheritedMap,
  mixins: inheritedMap,
  bindings: inheritedMap,
  values: inheritedMap,
  chainWatchers: ownCustomObject,
  chains: inheritedCustomObject,
  tag: ownCustomObject,
  tags: ownMap
};

// FLAGS
const SOURCE_DESTROYING = 1 << 1;
const SOURCE_DESTROYED = 1 << 2;
const META_DESTROYED = 1 << 3;
const IS_PROXY = 1 << 4;

if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
  members.lastRendered = ownMap;
  if (has('ember-debug')) { //https://github.com/emberjs/ember.js/issues/14732
    members.lastRenderedReferenceMap = ownMap;
    members.lastRenderedTemplateMap = ownMap;
  }
}

let memberNames = Object.keys(members);
const META_FIELD = '__ember_meta__';

export class Meta {
  constructor(obj, parentMeta) {
    if (DEBUG) {
      counters.metaInstantiated++;
    }

    this._cache = undefined;
    this._weak = undefined;
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

    if (EMBER_GLIMMER_DETECT_BACKTRACKING_RERENDER || EMBER_GLIMMER_ALLOW_BACKTRACKING_RERENDER) {
      this._lastRendered = undefined;
      if (DEBUG) {
        this._lastRenderedReferenceMap = undefined;
        this._lastRenderedTemplateMap = undefined;
      }
    }

    this._listeners = undefined;
    this._listenersFinalized = undefined;
    this._suspendedListeners = undefined;
  }

  isInitialized(obj) {
    return this.proto !== obj;
  }

  setTag(tag) {
    this._tag = tag;
  }

  getTag(tag) {
    return this._tag;
  }

  destroy() {
    if (this.isMetaDestroyed()) { return; }

    // remove chainWatchers to remove circular references that would prevent GC
    let nodes, key, nodeObject;
    let node = this.readableChains();
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

  _getInherited(key) {
    let pointer = this;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        return map;
      }
      pointer = pointer.parent;
    }
  }

  _findInherited(key, subkey) {
    let pointer = this;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        let value = map[subkey];
        if (value !== undefined) {
          return value;
        }
      }
      pointer = pointer.parent;
    }
  }

  // Implements a member that provides a lazily created map of maps,
  // with inheritance at both levels.
  writeDeps(subkey, itemkey, value) {
    assert(`Cannot call writeDeps after the object is destroyed.`, !this.isMetaDestroyed());

    let outerMap = this._getOrCreateOwnMap('_deps');
    let innerMap = outerMap[subkey];
    if (innerMap === undefined) {
      innerMap = outerMap[subkey] = Object.create(null);
    }
    innerMap[itemkey] = value;
  }

  peekDeps(subkey, itemkey) {
    let pointer = this;
    while (pointer !== undefined) {
      let map = pointer._deps;
      if (map !== undefined) {
        let value = map[subkey];
        if (value !== undefined) {
          let itemvalue = value[itemkey];
          if (itemvalue !== undefined) {
            return itemvalue;
          }
        }
      }
      pointer = pointer.parent;
    }
  }

  hasDeps(subkey) {
    let pointer = this;
    while (pointer !== undefined) {
      let deps = pointer._deps;
      if (deps !== undefined && deps[subkey] !== undefined) {
        return true;
      }
      pointer = pointer.parent;
    }
    return false;
  }

  forEachInDeps(subkey, fn) {
    return this._forEachIn('_deps', subkey, fn);
  }

  _forEachIn(key, subkey, fn) {
    let pointer = this;
    let seen;
    let calls;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        let innerMap = map[subkey];
        if (innerMap !== undefined) {
          for (let innerKey in innerMap) {
            seen = seen || Object.create(null);
            if (seen[innerKey] === undefined) {
              seen[innerKey] = true;
              calls = calls || [];
              calls.push([innerKey, innerMap[innerKey]]);
            }
          }
        }
      }
      pointer = pointer.parent;
    }
    if (calls !== undefined) {
      for (let i = 0; i < calls.length; i++) {
        let [innerKey, value] = calls[i];
        fn(innerKey, value);
      }
    }
  }

  readInheritedValue(key, subkey) {
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
  }

  writeValue(obj, key, value) {
    let descriptor = lookupDescriptor(obj, key);
    let isMandatorySetter = descriptor !== undefined&& descriptor.set && descriptor.set.isMandatorySetter;

    if (isMandatorySetter) {
      this.writeValues(key, value);
    } else {
      obj[key] = value;
    }
  }

  set factory(factory) {
    this._factory = factory;
  }

  get factory() {
    return this._factory;
  }
}

const NODE_STACK = [];

for (let name in listenerMethods) {
  Meta.prototype[name] = listenerMethods[name];
}
memberNames.forEach(name => members[name](name, Meta));

// Implements a member that is a lazily created, non-inheritable
// POJO.
function ownMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype[`writable${capitalized}`] = function() {
    return this._getOrCreateOwnMap(key);
  };
  Meta.prototype[`readable${capitalized}`] = function() { return this[key]; };
}

// Implements a member that is a lazily created POJO with inheritable
// values.
function inheritedMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype[`write${capitalized}`] = function(subkey, value) {
    assert(`Cannot call write${capitalized} after the object is destroyed.`, !this.isMetaDestroyed());

    let map = this._getOrCreateOwnMap(key);
    map[subkey] = value;
  };

  Meta.prototype[`peek${capitalized}`] = function(subkey) {
    return this._findInherited(key, subkey);
  };

  Meta.prototype[`forEach${capitalized}`] = function(fn) {
    let pointer = this;
    let seen;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        for (let key in map) {
          seen = seen || Object.create(null);
          if (seen[key] === undefined) {
            seen[key] = true;
            fn(key, map[key]);
          }
        }
      }
      pointer = pointer.parent;
    }
  };

  Meta.prototype[`clear${capitalized}`] = function() {
    assert(`Cannot call clear${capitalized} after the object is destroyed.`, !this.isMetaDestroyed());

    this[key] = undefined;
  };

  Meta.prototype[`deleteFrom${capitalized}`] = function(subkey) {
    delete this._getOrCreateOwnMap(key)[subkey];
  };

  Meta.prototype[`hasIn${capitalized}`] = function(subkey) {
    return this._findInherited(key, subkey) !== undefined;
  };
}

export const UNDEFINED = symbol('undefined');

// Implements a member that provides a non-heritable, lazily-created
// object using the method you provide.
function ownCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype[`writable${capitalized}`] = function(create) {
    assert(`Cannot call writable${capitalized} after the object is destroyed.`, !this.isMetaDestroyed());

    let ret = this[key];
    if (ret === undefined) {
      ret = this[key] = create(this.source);
    }
    return ret;
  };
  Meta.prototype[`readable${capitalized}`] = function() {
    return this[key];
  };
}

// Implements a member that provides an inheritable, lazily-created
// object using the method you provide. We will derived children from
// their parents by calling your object's `copy()` method.
function inheritedCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype[`writable${capitalized}`] = function(create) {
    assert(`Cannot call writable${capitalized} after the object is destroyed.`, !this.isMetaDestroyed());

    let ret = this[key];
    if (ret === undefined) {
      if (this.parent) {
        ret = this[key] = this.parent[`writable${capitalized}`](create).copy(this.source);
      } else {
        ret = this[key] = create(this.source);
      }
    }
    return ret;
  };
  Meta.prototype[`readable${capitalized}`] = function() {
    return this._getInherited(key);
  };
}


function memberProperty(name) {
  return `_${name}`;
}

// there's a more general-purpose capitalize in ember-runtime, but we
// don't want to make ember-metal depend on ember-runtime.
function capitalize(name) {
  return name.replace(/^\w/, m => m.toUpperCase());
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
    let isMandatorySetter = descriptor !== undefined &&
                            descriptor !== null &&
                            descriptor.set && descriptor.set.isMandatorySetter;

    if (isMandatorySetter) {
      this.writeValues(key, value);
    } else {
      obj[key] = value;
    }
  };
}

let setMeta, peekMeta;

// choose the one appropriate for given platform
if (HAS_NATIVE_WEAKMAP) {
  let getPrototypeOf = Object.getPrototypeOf;
  let metaStore = new WeakMap();

  setMeta = function WeakMap_setMeta(obj, meta) {
    if (DEBUG) {
      counters.setCalls++;
    }
    metaStore.set(obj, meta);
  };

  peekMeta = function WeakMap_peekMeta(obj) {
    if (DEBUG) {
      counters.peekCalls++
    }

    return metaStore.get(obj);
  };

  peekMeta = function WeakMap_peekParentMeta(obj) {
    let pointer = obj;
    let meta;
    while (pointer !== undefined && pointer !== null) {
      meta = metaStore.get(pointer);
      // jshint loopfunc:true
      if (DEBUG) {
        counters.peekCalls++;
      }
      // stop if we find a `null` value, since
      // that means the meta was deleted
      // any other truthy value is a "real" meta
      if (meta === null || meta !== undefined) {
        return meta;
      }

      pointer = getPrototypeOf(pointer);
      if (DEBUG) {
        counters.peakPrototypeWalks++;
      }
    }
  };
} else {
  setMeta = function Fallback_setMeta(obj, meta) {
    // if `null` already, just set it to the new value
    // otherwise define property first
    if (obj[META_FIELD] !== null) {
      if (obj.__defineNonEnumerable) {
        obj.__defineNonEnumerable(EMBER_META_PROPERTY);
      } else {
        Object.defineProperty(obj, META_FIELD, META_DESC);
      }
    }

    obj[META_FIELD] = meta;
  };

  peekMeta = function Fallback_peekMeta(obj) {
    return obj[META_FIELD];
  };
}

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
  if (maybeMeta !== undefined && maybeMeta !== null) {
    if (maybeMeta.source === obj) {
      return maybeMeta;
    }
    parent = maybeMeta;
  }

  let newMeta = new Meta(obj, parent);
  setMeta(obj, newMeta);
  return newMeta;
}

export {
  peekMeta,
  setMeta,
  counters
};
