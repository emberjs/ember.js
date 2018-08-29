import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Tag } from '@glimmer/reference';
import { lookupDescriptor, symbol, toString } from 'ember-utils';

const objectPrototype = Object.prototype;

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
const enum MetaFlags {
  NONE = 0,
  SOURCE_DESTROYING = 1 << 0,
  SOURCE_DESTROYED = 1 << 1,
  META_DESTROYED = 1 << 2,
  INITIALIZING = 1 << 3,
}

export class Meta {
  _descriptors: any | undefined;
  _watching: any | undefined;
  _mixins: any | undefined;
  _deps: any | undefined;
  _chainWatchers: any | undefined;
  _chains: any | undefined;
  _tag: Tag | undefined;
  _tags: any | undefined;
  _flags: MetaFlags;
  source: object;
  proto: object | undefined;
  _parent: Meta | undefined | null;
  _listeners: any | undefined;
  _listenersFinalized: boolean;

  // DEBUG
  _values: any | undefined;
  _bindings: any | undefined;

  constructor(obj: object) {
    if (DEBUG) {
      counters!.metaInstantiated++;
      this._values = undefined;
    }
    this._parent = undefined;
    this._descriptors = undefined;
    this._watching = undefined;
    this._mixins = undefined;
    this._deps = undefined;
    this._chainWatchers = undefined;
    this._chains = undefined;
    this._tag = undefined;
    this._tags = undefined;

    // initial value for all flags right now is false
    // see FLAGS const for detailed list of flags used
    this._flags = MetaFlags.NONE;

    // used only internally
    this.source = obj;
    this.proto = obj.constructor === undefined ? undefined : obj.constructor.prototype;

    this._listeners = undefined;
    this._listenersFinalized = false;
  }

  get parent() {
    let parent = this._parent;
    if (parent === undefined) {
      let proto = getPrototypeOf(this.source);
      this._parent = parent = proto === null || proto === objectPrototype ? null : meta(proto);
    }
    return parent;
  }

  setInitializing() {
    this._flags |= MetaFlags.INITIALIZING;
  }

  unsetInitializing() {
    this._flags ^= MetaFlags.INITIALIZING;
  }

  isInitializing() {
    return this._hasFlag(MetaFlags.INITIALIZING);
  }

  isPrototypeMeta(obj: object) {
    return this.proto === this.source && this.source === obj;
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
    return this._hasFlag(MetaFlags.SOURCE_DESTROYING);
  }

  setSourceDestroying() {
    this._flags |= MetaFlags.SOURCE_DESTROYING;
  }

  isSourceDestroyed() {
    return this._hasFlag(MetaFlags.SOURCE_DESTROYED);
  }

  setSourceDestroyed() {
    this._flags |= MetaFlags.SOURCE_DESTROYED;
  }

  isMetaDestroyed() {
    return this._hasFlag(MetaFlags.META_DESTROYED);
  }

  setMetaDestroyed() {
    this._flags |= MetaFlags.META_DESTROYED;
  }

  _hasFlag(flag: number) {
    return (this._flags & flag) === flag;
  }

  _getOrCreateOwnMap(key: string) {
    return this[key] || (this[key] = Object.create(null));
  }

  _getOrCreateOwnSet(key: string) {
    return this[key] || (this[key] = new Set());
  }

  _findInherited1(key: string): any | undefined {
    let pointer: Meta | null = this;
    while (pointer !== null) {
      let map = pointer[key];
      if (map !== undefined) {
        return map;
      }
      pointer = pointer.parent;
    }
  }

  _findInherited2(key: string, subkey: string): any | undefined {
    let pointer: Meta | null = this;
    while (pointer !== null) {
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

  _findInherited3(key: string, subkey: string, subsubkey: string): any | undefined {
    let pointer: Meta | null = this;
    while (pointer !== null) {
      let map = pointer[key];
      if (map !== undefined) {
        let submap = map[subkey];
        if (submap !== undefined) {
          let value = submap[subsubkey];
          if (value !== undefined) {
            return value;
          }
        }
      }
      pointer = pointer.parent;
    }
  }

  _hasInInheritedSet(key: string, value: any) {
    let pointer: Meta | null = this;
    while (pointer !== null) {
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

    let outerMap = this._getOrCreateOwnMap('_deps');
    let innerMap = outerMap[subkey];
    if (innerMap === undefined) {
      innerMap = outerMap[subkey] = Object.create(null);
    }
    innerMap[itemkey] = count;
  }

  peekDeps(subkey: string, itemkey: string): number {
    let val = this._findInherited3('_deps', subkey, itemkey);
    return val === undefined ? 0 : val;
  }

  hasDeps(subkey: string): boolean {
    let val = this._findInherited2('_deps', subkey);
    return val !== undefined;
  }

  forEachInDeps(subkey: string, fn: Function) {
    let pointer: Meta | null = this;
    let seen: Set<any> | undefined;
    let calls: any[] | undefined;
    while (pointer !== null) {
      let map = pointer._deps;
      if (map !== undefined) {
        let innerMap = map[subkey];
        if (innerMap !== undefined) {
          for (let innerKey in innerMap) {
            seen = seen === undefined ? new Set() : seen;
            if (!seen.has(innerKey)) {
              seen.add(innerKey);
              if (innerMap[innerKey] > 0) {
                calls = calls || [];
                calls.push(innerKey);
              }
            }
          }
        }
      }
      pointer = pointer.parent;
    }

    if (calls !== undefined) {
      for (let i = 0; i < calls.length; i++) {
        fn(calls[i]);
      }
    }
  }

  writableTags() {
    return this._getOrCreateOwnMap('_tags');
  }
  readableTags() {
    return this._tags;
  }

  writableTag(create: (obj: object) => Tag) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new tag for \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let ret = this._tag;
    if (ret === undefined) {
      ret = this._tag = create(this.source);
    }
    return ret;
  }

  readableTag() {
    return this._tag;
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
    let ret = this._chainWatchers;
    if (ret === undefined) {
      ret = this._chainWatchers = create(this.source);
    }
    return ret;
  }

  readableChainWatchers() {
    return this._chainWatchers;
  }

  writableChains(create: (source: object) => any) {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new chains for \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let { _chains: ret } = this;
    if (ret === undefined) {
      this._chains = ret = create(this.source);

      let { parent } = this;
      if (parent !== null) {
        let parentChains = parent.writableChains(create);
        parentChains.copyTo(ret);
      }
    }
    return ret;
  }

  readableChains() {
    return this._findInherited1('_chains');
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
    let map = this._getOrCreateOwnMap('_watching');
    map[subkey] = value;
  }

  peekWatching(subkey: string): number {
    let count = this._findInherited2('_watching', subkey);
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
    let set = this._getOrCreateOwnSet('_mixins');
    set.add(mixin);
  }

  hasMixin(mixin: any) {
    return this._hasInInheritedSet('_mixins', mixin);
  }

  forEachMixins(fn: Function) {
    let pointer: Meta | null = this;
    let seen: Set<any> | undefined;
    while (pointer !== null) {
      let set = pointer._mixins;
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
    let map = this._getOrCreateOwnMap('_descriptors');
    map[subkey] = value;
  }

  peekDescriptors(subkey: string) {
    let possibleDesc = this._findInherited2('_descriptors', subkey);
    return possibleDesc === UNDEFINED ? undefined : possibleDesc;
  }

  removeDescriptors(subkey: string) {
    this.writeDescriptors(subkey, UNDEFINED);
  }

  forEachDescriptors(fn: Function) {
    let pointer: Meta | null = this;
    let seen: Set<any> | undefined;
    while (pointer !== null) {
      let map = pointer._descriptors;
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
    if (this._listeners === undefined) {
      this._listeners = [];
    }
    this._listeners.push(eventName, target, method, once);
  }

  _finalizeListeners() {
    if (this._listenersFinalized) {
      return;
    }
    if (this._listeners === undefined) {
      this._listeners = [];
    }
    let pointer = this.parent;
    while (pointer !== null) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        this._listeners = this._listeners.concat(listeners);
      }
      if (pointer._listenersFinalized) {
        break;
      }
      pointer = pointer.parent;
    }
    this._listenersFinalized = true;
  }

  removeFromListeners(eventName: string, target: any, method: Function | string): void {
    let pointer: Meta | null = this;
    while (pointer !== null) {
      let listeners = pointer._listeners;
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
              this._finalizeListeners();
              return this.removeFromListeners(eventName, target, method);
            }
          }
        }
      }
      if (pointer._listenersFinalized) {
        break;
      }
      pointer = pointer.parent;
    }
  }

  matchingListeners(eventName: string) {
    let pointer: Meta | null = this;
    // fix type
    let result: any[] | undefined;
    while (pointer !== null) {
      let listeners = pointer._listeners;
      if (listeners !== undefined) {
        for (let index = 0; index < listeners.length; index += 4) {
          if (listeners[index] === eventName) {
            result = result || [];
            pushUniqueListener(result, listeners, index);
          }
        }
      }
      if (pointer._listenersFinalized) {
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

    let map = this._getOrCreateOwnMap('_values');
    map[subkey] = value;
  };

  Meta.prototype.peekValues = function(subkey: string) {
    return this._findInherited2('_values', subkey);
  };

  Meta.prototype.deleteFromValues = function(subkey: string) {
    delete this._getOrCreateOwnMap('_values')[subkey];
  };

  Meta.prototype.readInheritedValue = function(key, subkey) {
    let internalKey = `_${key}`;

    let pointer: Meta | null = this;

    while (pointer !== null) {
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

  if (DEBUG) {
    counters!.peekCalls++;
  }

  let meta = metaStore.get(obj);

  if (meta !== undefined) {
    return meta;
  }

  let pointer = getPrototypeOf(obj);

  while (pointer !== undefined && pointer !== null) {
    if (DEBUG) {
      counters!.peekPrototypeWalks++;
    }

    meta = metaStore.get(pointer);

    if (meta !== undefined) {
      if (meta.proto !== pointer) {
        // The meta was a prototype meta which was not marked as initializing.
        // This can happen when a prototype chain was created manually via
        // Object.create() and the source object does not have a constructor.
        meta.proto = pointer;
      }
      return meta;
    }

    pointer = getPrototypeOf(pointer);
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

  // remove this code, in-favor of explicit parent
  if (maybeMeta !== undefined && maybeMeta.source === obj) {
    return maybeMeta;
  }

  let newMeta = new Meta(obj);
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
