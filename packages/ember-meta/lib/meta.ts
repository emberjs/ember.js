import { assert } from '@ember/debug';
import { BINDING_SUPPORT } from '@ember/deprecated-features';
import { DEBUG } from '@glimmer/env';
import { Tag } from '@glimmer/reference';
import { ENV } from 'ember-environment';
import { lookupDescriptor, symbol, toString } from 'ember-utils';

export interface MetaCounters {
  peekCalls: number;
  peekPrototypeWalks: number;
  setCalls: number;
  deleteCalls: number;
  metaCalls: number;
  metaInstantiated: number;
}

let counters: MetaCounters | undefined;
if (DEBUG) {
  counters = {
    peekCalls: 0,
    peekPrototypeWalks: 0,
    setCalls: 0,
    deleteCalls: 0,
    metaCalls: 0,
    metaInstantiated: 0,
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

export class Meta {
  private descriptors: any | undefined = undefined;
  private watching: any | undefined = undefined;
  private mixins: any | undefined = undefined;
  private deps: any | undefined = undefined;
  private chainWatchers: any | undefined = undefined;
  private chains: any | undefined = undefined;
  private tag: Tag | undefined = undefined;
  private tags: any | undefined = undefined;
  //initial value for all flags right now is false
  // see FLAGS const for detailed list of flags used
  private flags = 0;
  private listeners: any | undefined = undefined;
  private listenersFinalized = false;
  // DEBUG
  private values: any | undefined;
  private bindings: any | undefined;

  source: object;
  // when meta(obj).proto === obj, the object is intended to be only a
  // prototype and doesn't need to actually be observable itself
  proto: object | undefined = undefined;
  parent: Meta | undefined;

  constructor(obj: object, parentMeta: Meta | undefined) {
    if (DEBUG) {
      counters!.metaInstantiated++;
      this.values = undefined;
    }
    if (BINDING_SUPPORT && ENV._ENABLE_BINDING_SUPPORT) {
      this.bindings = undefined;
    }

    // used only internally
    this.source = obj;

    // The next meta in our inheritance chain. We (will) track this
    // explicitly instead of using prototypical inheritance because we
    // have detailed knowledge of how each property should really be
    // inherited, and we can optimize it much better than JS runtimes.
    this.parent = parentMeta;
  }

  isInitialized(obj: object) {
    return this.proto !== obj;
  }

  destroy() {
    if (this.isMetaDestroyed()) {
      return;
    }
    this.setMetaDestroyed();

    // remove chainWatchers to remove circular references that would prevent GC
    let chains = this.readableChains();
    if (chains !== undefined) {
      chains.destroy();
    }
  }

  isSourceDestroying() {
    return this.hasFlag(SOURCE_DESTROYING);
  }

  setSourceDestroying() {
    this.flags |= SOURCE_DESTROYING;
  }

  isSourceDestroyed() {
    return this.hasFlag(SOURCE_DESTROYED);
  }

  setSourceDestroyed() {
    this.flags |= SOURCE_DESTROYED;
  }

  isMetaDestroyed() {
    return this.hasFlag(META_DESTROYED);
  }

  setMetaDestroyed() {
    this.flags |= META_DESTROYED;
  }

  private hasFlag(flag: number) {
    return (this.flags & flag) === flag;
  }

  private getOrCreateOwnMap(key: string) {
    return this[key] || (this[key] = Object.create(null));
  }

  private getOrCreateOwnSet(key: string) {
    return this[key] || (this[key] = new Set());
  }

  private getInherited(key: string) {
    let pointer: Meta | undefined = this;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        return map;
      }
      pointer = pointer.parent;
    }
  }

  private findInherited(key: string, subkey: string): any | undefined {
    let pointer: Meta | undefined = this;
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

  private hasInInheritedSet(key: string, value: any) {
    let pointer: Meta | undefined = this;
    while (pointer !== undefined) {
      let set = pointer[key];
      if (set !== undefined && set.has(value)) {
        return true;
      }
      pointer = pointer.parent;
    }
    return false;
  }

  // Implements a member that provides a lazily created map of maps,
  // with inheritance at both levels.
  writeDeps(subkey: string, itemkey: string, count: number) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot modify dependent keys for \`${itemkey}\` on \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );

    let outerMap = this.getOrCreateOwnMap('deps');
    let innerMap = outerMap[subkey];
    if (innerMap === undefined) {
      innerMap = outerMap[subkey] = Object.create(null);
    }
    innerMap[itemkey] = count;
  }

  peekDeps(subkey: string, itemkey: string): number {
    let pointer: Meta | undefined = this;
    while (pointer !== undefined) {
      let map = pointer.deps;
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

    return 0;
  }

  hasDeps(subkey: string) {
    let pointer: Meta | undefined = this;
    while (pointer !== undefined) {
      let deps = pointer.deps;
      if (deps !== undefined && deps[subkey] !== undefined) {
        return true;
      }
      pointer = pointer.parent;
    }
    return false;
  }

  forEachInDeps(subkey: string, fn: Function) {
    return this.forEachIn('deps', subkey, fn);
  }

  private forEachIn(key: string, subkey: string, fn: Function) {
    let pointer: Meta | undefined = this;
    let seen: Set<any> | undefined;
    let calls: any[] | undefined;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map !== undefined) {
        let innerMap = map[subkey];
        if (innerMap !== undefined) {
          for (let innerKey in innerMap) {
            seen = seen === undefined ? new Set() : seen;
            if (!seen.has(innerKey)) {
              seen.add(innerKey);
              calls = calls || [];
              calls.push(innerKey, innerMap[innerKey]);
            }
          }
        }
      }
      pointer = pointer.parent;
    }

    if (calls !== undefined) {
      for (let i = 0; i < calls.length; i += 2) {
        fn(calls[i], calls[i + 1]);
      }
    }
  }

  writableTags() {
    return this.getOrCreateOwnMap('tags');
  }

  readableTags() {
    return this.tags;
  }

  writableTag(create: (obj: object) => Tag) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new tag for \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let ret = this.tag;
    if (ret === undefined) {
      ret = this.tag = create(this.source);
    }
    return ret;
  }

  readableTag() {
    return this.tag;
  }

  writableChainWatchers(create: (source: object) => any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new chain watcher for \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let ret = this.chainWatchers;
    if (ret === undefined) {
      ret = this.chainWatchers = create(this.source);
    }
    return ret;
  }

  readableChainWatchers() {
    return this.chainWatchers;
  }

  writableChains(create: (source: object) => any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new chains for \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let ret = this.chains;
    if (ret === undefined) {
      if (this.parent === undefined) {
        ret = create(this.source);
      } else {
        ret = this.parent.writableChains(create).copy(this.source);
      }
      this.chains = ret;
    }
    return ret;
  }

  readableChains() {
    return this.getInherited('chains');
  }

  writeWatching(subkey: string, value: any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot update watchers for \`${subkey}\` on \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let map = this.getOrCreateOwnMap('watching');
    map[subkey] = value;
  }

  peekWatching(subkey: string): number {
    let count = this.findInherited('watching', subkey);
    return count === undefined ? 0 : count;
  }

  addMixin(mixin: any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot add mixins of \`${toString(mixin)}\` on \`${toString(
            this.source
          )}\` call addMixin after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let set = this.getOrCreateOwnSet('mixins');
    set.add(mixin);
  }

  hasMixin(mixin: any) {
    return this.hasInInheritedSet('mixins', mixin);
  }

  forEachMixins(fn: Function) {
    let pointer: Meta | undefined = this;
    let seen: Set<any> | undefined;
    while (pointer !== undefined) {
      let set = pointer.mixins;
      if (set !== undefined) {
        seen = seen === undefined ? new Set() : seen;
        // TODO cleanup typing here
        set.forEach((mixin: any) => {
          if (!seen!.has(mixin)) {
            seen!.add(mixin);
            fn(mixin);
          }
        });
      }
      pointer = pointer.parent;
    }
  }

  writeDescriptors(subkey: string, value: any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot update descriptors for \`${subkey}\` on \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let map = this.getOrCreateOwnMap('descriptors');
    map[subkey] = value;
  }

  peekDescriptors(subkey: string) {
    let possibleDesc = this.findInherited('descriptors', subkey);
    return possibleDesc === UNDEFINED ? undefined : possibleDesc;
  }

  removeDescriptors(subkey: string) {
    this.writeDescriptors(subkey, UNDEFINED);
  }

  forEachDescriptors(fn: Function) {
    let pointer: Meta | undefined = this;
    let seen: Set<any> | undefined;
    while (pointer !== undefined) {
      let map = pointer.descriptors;
      if (map !== undefined) {
        for (let key in map) {
          seen = seen === undefined ? new Set() : seen;
          if (!seen.has(key)) {
            seen.add(key);
            let value = map[key];
            if (value !== UNDEFINED) {
              fn(key, value);
            }
          }
        }
      }
      pointer = pointer.parent;
    }
  }

  addToListeners(
    eventName: string,
    target: object | null,
    method: Function | string,
    once: boolean
  ) {
    if (this.listeners === undefined) {
      this.listeners = [];
    }
    this.listeners.push(eventName, target, method, once);
  }

  private finalizeListeners() {
    if (this.listenersFinalized) {
      return;
    }
    if (this.listeners === undefined) {
      this.listeners = [];
    }
    let pointer = this.parent;
    while (pointer !== undefined) {
      let listeners = pointer.listeners;
      if (listeners !== undefined) {
        this.listeners = this.listeners.concat(listeners);
      }
      if (pointer.listenersFinalized) {
        break;
      }
      pointer = pointer.parent;
    }
    this.listenersFinalized = true;
  }

  removeFromListeners(eventName: string, target: any, method: Function | string): void {
    let pointer: Meta | undefined = this;
    while (pointer !== undefined) {
      let listeners = pointer.listeners;
      if (listeners !== undefined) {
        for (let index = listeners.length - 4; index >= 0; index -= 4) {
          if (
            listeners[index] === eventName &&
            (!method || (listeners[index + 1] === target && listeners[index + 2] === method))
          ) {
            if (pointer === this) {
              listeners.splice(index, 4); // we are modifying our own list, so we edit directly
            } else {
              // we are trying to remove an inherited listener, so we do
              // just-in-time copying to detach our own listeners from
              // our inheritance chain.
              this.finalizeListeners();
              return this.removeFromListeners(eventName, target, method);
            }
          }
        }
      }
      if (pointer.listenersFinalized) {
        break;
      }
      pointer = pointer.parent;
    }
  }

  matchingListeners(eventName: string) {
    let pointer: Meta | undefined = this;
    // fix type
    let result: any[] | undefined;
    while (pointer !== undefined) {
      let listeners = pointer.listeners;
      if (listeners !== undefined) {
        for (let index = 0; index < listeners.length; index += 4) {
          if (listeners[index] === eventName) {
            result = result || [];
            pushUniqueListener(result, listeners, index);
          }
        }
      }
      if (pointer.listenersFinalized) {
        break;
      }
      pointer = pointer.parent;
    }
    return result;
  }
}

export interface Meta {
  writeValues(subkey: string, value: any): void;
  peekValues(key: string): any;
  deleteFromValues(key: string): any;
  readInheritedValue(key: string, subkey: string): any;
  writeValue(obj: object, key: string, value: any): any;
  writeBindings(subkey: string, value: any): void;
  peekBindings(subkey: string): void;
  forEachBindings(fn: Function): void;
  clearBindings(): void;
}

if (BINDING_SUPPORT && ENV._ENABLE_BINDING_SUPPORT) {
  Meta.prototype.writeBindings = function(subkey: string, value: any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot add a binding for \`${subkey}\` on \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );

    let map = this.getOrCreateOwnMap('bindings');
    map[subkey] = value;
  };

  Meta.prototype.peekBindings = function(subkey: string) {
    return this.findInherited('bindings', subkey);
  };

  Meta.prototype.forEachBindings = function(fn: Function) {
    let pointer: Meta | undefined = this;
    let seen: { [key: string]: any } | undefined;
    while (pointer !== undefined) {
      let map = pointer.bindings;
      if (map !== undefined) {
        for (let key in map) {
          // cleanup typing
          seen = seen === undefined ? Object.create(null) : seen;
          if (seen![key] === undefined) {
            seen![key] = true;
            fn(key, map[key]);
          }
        }
      }
      pointer = pointer.parent;
    }
  };

  Meta.prototype.clearBindings = function() {
    assert(
      this.isMetaDestroyed()
        ? `Cannot clear bindings on \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    this.bindings = undefined;
  };
}

if (DEBUG) {
  Meta.prototype.writeValues = function(subkey: string, value: any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot set the value of \`${subkey}\` on \`${toString(
            this.source
          )}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );

    let map = this.getOrCreateOwnMap('values');
    map[subkey] = value;
  };

  Meta.prototype.peekValues = function(subkey: string) {
    return this.findInherited('values', subkey);
  };

  Meta.prototype.deleteFromValues = function(subkey: string) {
    delete this.getOrCreateOwnMap('values')[subkey];
  };

  Meta.prototype.readInheritedValue = function(key, subkey) {
    let pointer: Meta | undefined = this;

    while (pointer !== undefined) {
      let map = pointer[key];
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

  Meta.prototype.writeValue = function(obj: object, key: string, value: any) {
    let descriptor = lookupDescriptor(obj, key);
    let isMandatorySetter =
      descriptor !== null && descriptor.set && (descriptor.set as any).isMandatorySetter;

    if (isMandatorySetter) {
      this.writeValues(key, value);
    } else {
      obj[key] = value;
    }
  };
}

const getPrototypeOf = Object.getPrototypeOf;
const metaStore = new WeakMap();

export function setMeta(obj: object, meta: Meta) {
  assert('Cannot call `setMeta` on null', obj !== null);
  assert('Cannot call `setMeta` on undefined', obj !== undefined);
  assert(
    `Cannot call \`setMeta\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  if (DEBUG) {
    counters!.setCalls++;
  }
  metaStore.set(obj, meta);
}

export function peekMeta(obj: object) {
  assert('Cannot call `peekMeta` on null', obj !== null);
  assert('Cannot call `peekMeta` on undefined', obj !== undefined);
  assert(
    `Cannot call \`peekMeta\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  let pointer = obj;
  let meta;
  while (pointer !== undefined && pointer !== null) {
    meta = metaStore.get(pointer);
    // jshint loopfunc:true
    if (DEBUG) {
      counters!.peekCalls++;
    }
    if (meta !== undefined) {
      return meta;
    }

    pointer = getPrototypeOf(pointer);
    if (DEBUG) {
      counters!.peekPrototypeWalks++;
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
export function deleteMeta(obj: object) {
  assert('Cannot call `deleteMeta` on null', obj !== null);
  assert('Cannot call `deleteMeta` on undefined', obj !== undefined);
  assert(
    `Cannot call \`deleteMeta\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  if (DEBUG) {
    counters!.deleteCalls++;
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
export const meta: {
  (obj: object): Meta;
  _counters?: MetaCounters;
} = function meta(obj: object) {
  assert('Cannot call `meta` on null', obj !== null);
  assert('Cannot call `meta` on undefined', obj !== undefined);
  assert(
    `Cannot call \`meta\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  if (DEBUG) {
    counters!.metaCalls++;
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
};

if (DEBUG) {
  meta._counters = counters;
}

/**
  Returns the CP descriptor assocaited with `obj` and `keyName`, if any.

  @method descriptorFor
  @param {Object} obj the object to check
  @param {String} keyName the key to check
  @return {Descriptor}
  @private
*/
export function descriptorFor(obj: object, keyName: string, _meta?: Meta) {
  assert('Cannot call `descriptorFor` on null', obj !== null);
  assert('Cannot call `descriptorFor` on undefined', obj !== undefined);
  assert(
    `Cannot call \`descriptorFor\` on ${typeof obj}`,
    typeof obj === 'object' || typeof obj === 'function'
  );

  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  if (meta !== undefined) {
    return meta.peekDescriptors(keyName);
  }
}

/**
  Check whether a value is a CP descriptor.

  @method descriptorFor
  @param {any} possibleDesc the value to check
  @return {boolean}
  @private
*/
export function isDescriptor(possibleDesc: any | undefined | null): boolean {
  // TODO make this return `possibleDesc is Descriptor`
  return (
    possibleDesc !== undefined &&
    possibleDesc !== null &&
    typeof possibleDesc === 'object' &&
    possibleDesc.isDescriptor === true
  );
}

export { counters };

/*
 When we render a rich template hierarchy, the set of events that
 *might* happen tends to be much larger than the set of events that
 actually happen. This implies that we should make listener creation &
 destruction cheap, even at the cost of making event dispatch more
 expensive.

 Thus we store a new listener with a single push and no new
 allocations, without even bothering to do deduplication -- we can
 save that for dispatch time, if an event actually happens.
 */
function pushUniqueListener(destination: any[], source: any[], index: number) {
  let target = source[index + 1];
  let method = source[index + 2];
  for (let destinationIndex = 0; destinationIndex < destination.length; destinationIndex += 3) {
    if (destination[destinationIndex] === target && destination[destinationIndex + 1] === method) {
      return;
    }
  }
  destination.push(target, method, source[index + 3]);
}
