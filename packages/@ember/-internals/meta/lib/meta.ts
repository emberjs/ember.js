import { symbol, toString } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { createUpdatableTag, UpdatableTag } from '@glimmer/reference';

type ObjMap<T> = { [key: string]: T };

const objectPrototype = Object.prototype;

export interface MetaCounters {
  peekCalls: number;
  peekPrototypeWalks: number;
  setCalls: number;
  deleteCalls: number;
  metaCalls: number;
  metaInstantiated: number;
  matchingListenersCalls: number;
  observerEventsCalls: number;
  addToListenersCalls: number;
  removeFromListenersCalls: number;
  removeAllListenersCalls: number;
  listenersInherited: number;
  listenersFlattened: number;
  parentListenersUsed: number;
  flattenedListenersCalls: number;
  reopensAfterFlatten: number;
  readableLazyChainsCalls: number;
  writableLazyChainsCalls: number;
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
    matchingListenersCalls: 0,
    observerEventsCalls: 0,
    addToListenersCalls: 0,
    removeFromListenersCalls: 0,
    removeAllListenersCalls: 0,
    listenersInherited: 0,
    listenersFlattened: 0,
    parentListenersUsed: 0,
    flattenedListenersCalls: 0,
    reopensAfterFlatten: 0,
    readableLazyChainsCalls: 0,
    writableLazyChainsCalls: 0,
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

const enum ListenerKind {
  ADD = 0,
  ONCE = 1,
  REMOVE = 2,
}

interface StringListener {
  event: string;
  target: null;
  method: string;
  kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
  sync: boolean;
}

interface FunctionListener {
  event: string;
  target: object | null;
  method: Function;
  kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
  sync: boolean;
}

type Listener = StringListener | FunctionListener;

let currentListenerVersion = 1;

export class Meta {
  _descriptors: Map<string, any> | undefined;
  _mixins: any | undefined;
  _tag: UpdatableTag | undefined;
  _tags: ObjMap<UpdatableTag> | undefined;
  _flags: MetaFlags;
  _lazyChains: ObjMap<ObjMap<UpdatableTag>> | undefined;
  source: object;
  proto: object | undefined;
  _parent: Meta | undefined | null;

  _listeners: Listener[] | undefined;
  _listenersVersion = 1;
  _inheritedEnd = -1;
  _flattenedVersion = 0;

  // DEBUG
  _values: any | undefined;

  constructor(obj: object) {
    if (DEBUG) {
      counters!.metaInstantiated++;
      this._values = undefined;
    }
    this._parent = undefined;
    this._descriptors = undefined;
    this._mixins = undefined;
    this._tag = undefined;
    this._tags = undefined;

    // initial value for all flags right now is false
    // see FLAGS const for detailed list of flags used
    this._flags = MetaFlags.NONE;

    // used only internally
    this.source = obj;
    this.proto = obj.constructor === undefined ? undefined : obj.constructor.prototype;

    this._listeners = undefined;
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

  _findInheritedMap(key: string, subkey: string): any | undefined {
    let pointer: Meta | null = this;
    while (pointer !== null) {
      let map: Map<string, any> = pointer[key];
      if (map !== undefined) {
        let value = map.get(subkey);
        if (value !== undefined) {
          return value;
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

  writableTags() {
    return this._getOrCreateOwnMap('_tags');
  }
  readableTags() {
    return this._tags;
  }

  writableTag() {
    assert(
      this.isMetaDestroyed()
        ? `Cannot create a new tag for \`${toString(this.source)}\` after it has been destroyed.`
        : '',
      !this.isMetaDestroyed()
    );
    let ret = this._tag;
    if (ret === undefined) {
      ret = this._tag = createUpdatableTag();
    }
    return ret;
  }

  readableTag() {
    return this._tag;
  }

  writableLazyChainsFor(key: string) {
    if (DEBUG) {
      counters!.writableLazyChainsCalls++;
    }

    let lazyChains = this._getOrCreateOwnMap('_lazyChains');

    if (!(key in lazyChains)) {
      lazyChains[key] = Object.create(null);
    }

    return lazyChains[key];
  }

  readableLazyChainsFor(key: string) {
    if (DEBUG) {
      counters!.readableLazyChainsCalls++;
    }

    let lazyChains = this._lazyChains;

    if (lazyChains !== undefined) {
      return lazyChains[key];
    }

    return undefined;
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
    let map = this._descriptors || (this._descriptors = new Map());
    map.set(subkey, value);
  }

  peekDescriptors(subkey: string) {
    let possibleDesc = this._findInheritedMap('_descriptors', subkey);
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
        seen = seen === undefined ? new Set() : seen;
        map.forEach((value, key) => {
          if (!seen!.has(key)) {
            seen!.add(key);
            if (value !== UNDEFINED) {
              fn(key, value);
            }
          }
        });
      }
      pointer = pointer.parent;
    }
  }

  addToListeners(
    eventName: string,
    target: object | null,
    method: Function | string,
    once: boolean,
    sync: boolean
  ) {
    if (DEBUG) {
      counters!.addToListenersCalls++;
    }

    this.pushListener(eventName, target, method, once ? ListenerKind.ONCE : ListenerKind.ADD, sync);
  }

  removeFromListeners(eventName: string, target: object | null, method: Function | string): void {
    if (DEBUG) {
      counters!.removeFromListenersCalls++;
    }

    this.pushListener(eventName, target, method, ListenerKind.REMOVE);
  }

  private pushListener(
    event: string,
    target: object | null,
    method: Function | string,
    kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE,
    sync = false
  ): void {
    let listeners = this.writableListeners();

    let i = indexOfListener(listeners, event, target, method!);

    // remove if found listener was inherited
    if (i !== -1 && i < this._inheritedEnd) {
      listeners.splice(i, 1);
      this._inheritedEnd--;
      i = -1;
    }

    // if not found, push. Note that we must always push if a listener is not
    // found, even in the case of a function listener remove, because we may be
    // attempting to add or remove listeners _before_ flattening has occured.
    if (i === -1) {
      assert(
        'You cannot add function listeners to prototypes. Convert the listener to a string listener, or add it to the instance instead.',
        !(this.isPrototypeMeta(this.source) && typeof method === 'function')
      );

      assert(
        'You attempted to remove a function listener which did not exist on the instance, which means you may have attempted to remove it before it was added.',
        !(
          !this.isPrototypeMeta(this.source) &&
          typeof method === 'function' &&
          kind === ListenerKind.REMOVE
        )
      );

      listeners.push({
        event,
        target,
        method,
        kind,
        sync,
      } as Listener);
    } else {
      let listener = listeners[i];

      // If the listener is our own listener and we are trying to remove it, we
      // want to splice it out entirely so we don't hold onto a reference.
      if (kind === ListenerKind.REMOVE && listener.kind !== ListenerKind.REMOVE) {
        listeners.splice(i, 1);
      } else {
        assert(
          `You attempted to add an observer for the same method on '${
            event.split(':')[0]
          }' twice to ${target} as both sync and async. Observers must be either sync or async, they cannot be both. This is likely a mistake, you should either remove the code that added the observer a second time, or update it to always be sync or async. The method was ${method}.`,
          !(
            listener.kind === ListenerKind.ADD &&
            kind === ListenerKind.ADD &&
            listener.sync !== sync
          )
        );

        // update own listener
        listener.kind = kind;
        listener.sync = sync;
      }
    }
  }

  private writableListeners(): Listener[] {
    // Check if we need to invalidate and reflatten. We need to do this if we
    // have already flattened (flattened version is the current version) and
    // we are either writing to a prototype meta OR we have never inherited, and
    // may have cached the parent's listeners.
    if (
      this._flattenedVersion === currentListenerVersion &&
      (this.source === this.proto || this._inheritedEnd === -1)
    ) {
      if (DEBUG) {
        counters!.reopensAfterFlatten++;
      }

      currentListenerVersion++;
    }

    // Inherited end has not been set, then we have never created our own
    // listeners, but may have cached the parent's
    if (this._inheritedEnd === -1) {
      this._inheritedEnd = 0;
      this._listeners = [];
    }

    return this._listeners!;
  }

  /**
    Flattening is based on a global revision counter. If the revision has
    bumped it means that somewhere in a class inheritance chain something has
    changed, so we need to reflatten everything. This can only happen if:

    1. A meta has been flattened (listener has been called)
    2. The meta is a prototype meta with children who have inherited its
       listeners
    3. A new listener is subsequently added to the meta (e.g. via `.reopen()`)

    This is a very rare occurence, so while the counter is global it shouldn't
    be updated very often in practice.
  */
  private flattenedListeners(): Listener[] | undefined {
    if (DEBUG) {
      counters!.flattenedListenersCalls++;
    }

    if (this._flattenedVersion < currentListenerVersion) {
      if (DEBUG) {
        counters!.listenersFlattened++;
      }

      let parent = this.parent;

      if (parent !== null) {
        // compute
        let parentListeners = parent.flattenedListeners();

        if (parentListeners !== undefined) {
          if (this._listeners === undefined) {
            // If this instance doesn't have any of its own listeners (writableListeners
            // has never been called) then we don't need to do any flattening, return
            // the parent's listeners instead.
            if (DEBUG) {
              counters!.parentListenersUsed++;
            }

            this._listeners = parentListeners;
          } else {
            let listeners = this._listeners;

            if (this._inheritedEnd > 0) {
              listeners.splice(0, this._inheritedEnd);
              this._inheritedEnd = 0;
            }

            for (let i = 0; i < parentListeners.length; i++) {
              let listener = parentListeners[i];
              let index = indexOfListener(
                listeners,
                listener.event,
                listener.target,
                listener.method
              );

              if (index === -1) {
                if (DEBUG) {
                  counters!.listenersInherited++;
                }

                listeners.unshift(listener);
                this._inheritedEnd++;
              }
            }
          }
        }
      }

      this._flattenedVersion = currentListenerVersion;
    }

    return this._listeners;
  }

  matchingListeners(eventName: string): (string | boolean | object | null)[] | undefined {
    let listeners = this.flattenedListeners();
    let result;

    if (DEBUG) {
      counters!.matchingListenersCalls++;
    }

    if (listeners !== undefined) {
      for (let index = 0; index < listeners.length; index++) {
        let listener = listeners[index];

        // REMOVE listeners are placeholders that tell us not to
        // inherit, so they never match. Only ADD and ONCE can match.
        if (
          listener.event === eventName &&
          (listener.kind === ListenerKind.ADD || listener.kind === ListenerKind.ONCE)
        ) {
          if (result === undefined) {
            // we create this array only after we've found a listener that
            // matches to avoid allocations when no matches are found.
            result = [] as any[];
          }

          result.push(listener.target!, listener.method, listener.kind === ListenerKind.ONCE);
        }
      }
    }

    return result;
  }

  observerEvents() {
    let listeners = this.flattenedListeners();
    let result;

    if (DEBUG) {
      counters!.observerEventsCalls++;
    }

    if (listeners !== undefined) {
      for (let index = 0; index < listeners.length; index++) {
        let listener = listeners[index];

        // REMOVE listeners are placeholders that tell us not to
        // inherit, so they never match. Only ADD and ONCE can match.
        if (
          (listener.kind === ListenerKind.ADD || listener.kind === ListenerKind.ONCE) &&
          listener.event.indexOf(':change') !== -1
        ) {
          if (result === undefined) {
            // we create this array only after we've found a listener that
            // matches to avoid allocations when no matches are found.
            result = [] as any[];
          }

          result.push(listener);
        }
      }
    }

    return result;
  }
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

export function peekMeta(obj: object): Meta | null {
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

  while (pointer !== null) {
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

  return null;
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
  if (meta !== null) {
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
  if (maybeMeta !== null && maybeMeta.source === obj) {
    return maybeMeta;
  }

  let newMeta = new Meta(obj);
  setMeta(obj, newMeta);
  return newMeta;
};

if (DEBUG) {
  meta._counters = counters;
}

export { counters };

function indexOfListener(
  listeners: Listener[],
  event: string,
  target: object | null,
  method: Function | string | null
) {
  for (let i = listeners.length - 1; i >= 0; i--) {
    let listener = listeners[i];

    if (listener.event === event && (listener.target === target && listener.method === method)) {
      return i;
    }
  }
  return -1;
}
