// @glimmer/validator — VM-COMPAT (test-only) surface.
//
// This module holds the classic `@glimmer/validator` exports that are NOT
// reached by any live GXT-mode RUNTIME path (verified by a dist closure-trace
// from @ember/application + @ember/component + @ember/routing +
// @ember/-internals/glimmer — none import these). They are present only to
// satisfy the ported `@glimmer/validator` test suite, the
// `@glimmer-workspace/integration-tests` collection suites, and the standalone
// `@ember/reactive/collections` public-API entry.
//
// Keeping them in a SEPARATE module is what shrinks the prod app closure: the
// runtime shim (`./validator`) is what the app's bare/deep-path
// `@glimmer/validator` imports resolve to in the rollup GXT build, so it lands
// in the shared chunk every app entry pulls. This module is rooted ONLY by the
// `@glimmer/validator` package-entry facade (`./validator-entry`, a separate
// entry chunk), the `@ember/reactive/collections` entry, and the vite test
// tree — none of which are in the app closure — so its bytes tree-shake out of
// what a precompiled app ships. See docs in `scripts/gxt-alias-map.mjs`
// (GXT_SUBPATH_REDIRECTS) for how the `/lib/collections/*` deep paths route
// here while the bare specifier routes to the runtime shim.
//
// Everything here only CALLS the runtime tag primitives (imported from
// `./validator`); none of it reassigns the runtime module's shared tracking
// state, which is why the physical split is safe.

import {
  createUpdatableTag,
  createUpdatableTagNative,
  consumeTag,
  dirtyTag,
  dirtyTagFor,
  _scheduleCollectionFlush,
} from './validator';

// A volatile tag that always needs recomputation.
// Marked with _isVolatile so validateTag can detect it and report as invalid.
export const VOLATILE_TAG: any = {
  _isVolatile: true,
  _isNonDirtyable: true,
  _isNonUpdatable: true,
  get value() {
    return Date.now() + Math.random();
  },
};

// Revision counter for tag invalidation
let $REVISION = 1;

// Bump the global revision counter
export function bump() {
  $REVISION++;
  return $REVISION;
}

// --- Tag-based tracked collections ---------------------------------------
//
// These implementations port the stock @glimmer/validator collection proxies
// to the classic-tag infrastructure here. Each tracked collection uses the
// local createUpdatableTag() + consumeTag() + dirtyTag() so that reads during a
// createCache()/createComputeRef compute register into `_cacheTagTracker`
// and writes bump the tag's cell revision — causing the reference to be
// observed as invalid by the Glimmer VM's CheckTag/validateTag pipeline on
// the next rerender.
//
// Supports the second `options` argument with an `equals` function (defaults
// to Object.is) so `{ equals: () => false }` always-dirty tests pass.

interface ReactiveOptions<V> {
  equals: (a: V, b: V) => boolean;
  description?: string;
}

function resolveReactiveOptions<V>(options?: {
  equals?: (a: V, b: V) => boolean;
  description?: string;
}): ReactiveOptions<V> {
  return {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  };
}

// Hidden accessor symbol: a reactive-collection proxy returns its internal
// `collection` tag (the native-GXT-cell-backed `createUpdatableTagNative`) when
// read with this key. The each-source formula uses it to entangle directly with
// the collection's GXT cell (compile.ts `_gxtSubscribeBackingArray` for
// `$_eachSync`; glimmer-next list.ts `subscribeReactiveCollection` for
// `$_each`). A registered Symbol so the SAME key works across the ember-source
// bundle and the glimmer-next bundle without a cross-package import. Shared by
// any reactive collection wanting fine-grained each re-render on structural
// mutation. (compile.ts re-derives the SAME registered symbol independently via
// Symbol.for, so it carries no import dependency on this module.)
export const GXT_COLLECTION_TAG: unique symbol = Symbol.for('@ember/reactive:gxt-collection-tag');

const ARRAY_GETTER_METHODS = new Set<string | symbol>([
  Symbol.iterator,
  'concat',
  'entries',
  'every',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'forEach',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'values',
]);

// Methods where Array itself immediately reads `.length` after invocation.
const ARRAY_WRITE_THEN_READ_METHODS = new Set<string | symbol>(['fill', 'push', 'unshift']);

function convertArrayIndexKey(prop: string | symbol): number | null {
  if (typeof prop === 'symbol') return null;
  const num = Number(prop);
  if (isNaN(num)) return null;
  return num % 1 === 0 ? num : null;
}

export function trackedArray<T = unknown>(
  data?: T[],
  options?: { equals?: (a: T, b: T) => boolean; description?: string }
): T[] {
  const resolved = resolveReactiveOptions<T>(options);
  const arr: T[] = Array.isArray(data) ? data.slice() : [];
  // Native-cell-backed (entangles with the GXT formula tracker) so the
  // gxt-backend each-source formula can SUBSCRIBE to structural mutation via
  // the `GXT_COLLECTION_TAG` accessor. The storage-wrapped `createUpdatableTag`
  // does not entangle (see `createUpdatableTagNative` doc) — which is why a
  // `{{#each trackedArray}}` did not re-render on in-place push/splice/swap.
  const collection = createUpdatableTagNative();
  const storages = new Map<number, ReturnType<typeof createUpdatableTag>>();
  const boundFns = new Map<string | symbol, (...args: any[]) => any>();
  let nativelyAccessingLengthFromWriteMethod = false;

  const readStorageFor = (index: number) => {
    let storage = storages.get(index);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(index, storage);
    }
    consumeTag(storage);
  };

  const dirtyStorageFor = (index: number) => {
    const storage = storages.get(index);
    if (storage) dirtyTag(storage);
  };

  // Will be assigned to the Proxy once created (the proxy is the object a
  // `{{#each this.foo}}` source resolves to, and what the gxt-backend registers
  // in its array-owner map). `dirtyCollection` references it lazily.
  let proxy: T[];

  const dirtyCollection = () => {
    // Invalidate the collection's native GXT cell directly (NOT via `dirtyTag`,
    // which force-flushes `syncDomNow()` on EVERY call — catastrophic when a
    // single `push(...thousand)` fires this trap 1000×). `dirty()` marks the
    // cell stale → the each-source-formula/list opcode entangled with it
    // (compile.ts `_gxtSubscribeBackingArray` for `$_eachSync`, list.ts
    // `subscribeReactiveCollection` for `$_each`) is enqueued. The actual DOM
    // sync is COALESCED into ONE GXT `syncDom()` microtask (see
    // `_scheduleCollectionFlush`) — so a `push(...N)` re-renders the keyed list
    // ONCE, not N times.
    collection.dirty();
    storages.clear();
    _scheduleCollectionFlush();
  };

  proxy = new Proxy(arr, {
    get(target, prop) {
      const index = convertArrayIndexKey(prop);
      if (index !== null) {
        readStorageFor(index);
        consumeTag(collection);
        return (target as any)[index];
      }

      if (prop === 'length') {
        if (nativelyAccessingLengthFromWriteMethod) {
          nativelyAccessingLengthFromWriteMethod = false;
        } else {
          consumeTag(collection);
        }
        return (target as any).length;
      }

      if (ARRAY_WRITE_THEN_READ_METHODS.has(prop)) {
        nativelyAccessingLengthFromWriteMethod = true;
      }

      if (ARRAY_GETTER_METHODS.has(prop)) {
        let fn = boundFns.get(prop);
        if (!fn) {
          fn = (...args: any[]) => {
            consumeTag(collection);
            return (target as any)[prop](...args);
          };
          boundFns.set(prop, fn);
        }
        return fn;
      }

      // GXT fine-grained each-source subscription hook (gated, GXT-backend only).
      // The gxt-backend each-source formula (`compile.ts` `_gxtSubscribeBackingArray`)
      // needs to ENTANGLE the formula with this collection's reactive `collection`
      // tag so an in-place mutation (push/splice/swap/length=0) re-fires the keyed
      // list opcode. Going through `consumeTag(collection)` only re-reads the tag's
      // `value` getter — which does NOT reliably register the underlying GXT cell
      // with the active formula tracker (the wrapper getter loses the `qt.add(cell)`
      // entanglement). Exposing the `collection` tag here lets the formula read the
      // backing GXT cell DIRECTLY (`tag._innerCell.value`), which DOES entangle.
      // Symbol-keyed so it never collides with a real array property and stays
      // invisible to enumeration / `JSON.stringify` / template reads.
      if (prop === GXT_COLLECTION_TAG) {
        return collection;
      }

      return (target as any)[prop];
    },
    set(target, prop, value) {
      const isUnchanged = resolved.equals((target as any)[prop], value);
      if (isUnchanged) return true;

      (target as any)[prop] = value;

      const index = convertArrayIndexKey(prop);
      if (index !== null) {
        dirtyStorageFor(index);
        dirtyCollection();
      } else if (prop === 'length') {
        dirtyCollection();
      }
      return true;
    },
    getPrototypeOf() {
      return Array.prototype;
    },
  });
  return proxy as T[];
}

// ---- trackedMap ---------------------------------------------------------

export function trackedMap<K = unknown, V = unknown>(
  data?: Map<K, V> | Iterable<readonly [K, V]> | readonly (readonly [K, V])[] | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): Map<K, V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: Map<K, V> = data instanceof Map ? new Map(data.entries()) : new Map(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<K, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: K) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: K) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedMapImpl implements Map<K, V> {
    get(key: K): V | undefined {
      consumeTag(storageFor(key));
      return vals.get(key);
    }
    has(key: K): boolean {
      consumeTag(storageFor(key));
      return vals.has(key);
    }
    entries() {
      consumeTag(collection);
      return vals.entries();
    }
    keys() {
      consumeTag(collection);
      return vals.keys();
    }
    values() {
      consumeTag(collection);
      return vals.values();
    }
    forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void {
      consumeTag(collection);
      vals.forEach((v, k) => fn(v, k, this));
    }
    get size(): number {
      consumeTag(collection);
      return vals.size;
    }
    [Symbol.iterator](): MapIterator<[K, V]> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      const keys = this.keys();
      return {
        next(): IteratorResult<[K, V]> {
          const next = keys.next();
          if (next.done) {
            return { value: undefined as any, done: true };
          }
          const k = next.value as K;
          return { value: [k, self.get(k) as V], done: false };
        },
        return(value?: any): IteratorResult<[K, V]> {
          return { value, done: true };
        },
        throw(err?: any): IteratorResult<[K, V]> {
          throw err;
        },
        [Symbol.iterator](): MapIterator<[K, V]> {
          return this as any;
        },
      } as MapIterator<[K, V]>;
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
    set(key: K, value: V): this {
      const existing = vals.get(key);
      if (vals.has(key)) {
        const isUnchanged = resolved.equals(existing as V, value);
        if (isUnchanged) return this;
      }
      dirtyStorageFor(key);
      // Always dirty the collection tag — consumers iterating via
      // values()/entries()/forEach()/keys()/Symbol.iterator track this
      // tag and must re-evaluate when ANY value changes, not just on
      // new-key insertion. Matches the reference impl in
      // @glimmer/validator/lib/collections/map.ts.
      dirtyTag(collection);
      vals.set(key, value);
      return this;
    }
    getOrInsert(key: K, defaultValue: V): V {
      // Matches reference Map.prototype.getOrInsert semantics:
      // if key exists, consume per-key tag and return existing value;
      // otherwise insert default value (dirty per-key + collection tags
      // mirroring set()) and return it. The class-based impl must
      // implement this explicitly — Object.setPrototypeOf(...,Map.prototype)
      // exposes the method name on the prototype but Map.prototype.getOrInsert
      // throws "incompatible receiver" when invoked on a non-Map instance.
      if (vals.has(key)) {
        consumeTag(storageFor(key));
        return vals.get(key) as V;
      }
      dirtyStorageFor(key);
      dirtyTag(collection);
      vals.set(key, defaultValue);
      return defaultValue;
    }
    getOrInsertComputed(key: K, callback: (key: K) => V): V {
      // See getOrInsert above — same rationale (Map.prototype.getOrInsertComputed
      // throws on a non-Map receiver, so we must implement it explicitly).
      if (vals.has(key)) {
        consumeTag(storageFor(key));
        return vals.get(key) as V;
      }
      const computed = callback(key);
      dirtyStorageFor(key);
      dirtyTag(collection);
      vals.set(key, computed);
      return computed;
    }
    delete(key: K): boolean {
      // Spec: returns false when the key did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/map.ts).
      if (!vals.has(key)) return false;
      dirtyStorageFor(key);
      dirtyTag(collection);
      storages.delete(key);
      return vals.delete(key);
    }
    clear(): void {
      if (vals.size === 0) return;
      storages.forEach((s) => dirtyTag(s));
      storages.clear();
      dirtyTag(collection);
      vals.clear();
    }
  }

  Object.setPrototypeOf(TrackedMapImpl.prototype, Map.prototype);
  return new TrackedMapImpl();
}

// ---- trackedSet ---------------------------------------------------------

export function trackedSet<V = unknown>(
  data?: Set<V> | V[] | Iterable<V> | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): Set<V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: Set<V> = new Set(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<V, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: V) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: V) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedSetImpl implements Set<V> {
    has(value: V): boolean {
      consumeTag(storageFor(value));
      return vals.has(value);
    }
    entries() {
      consumeTag(collection);
      return vals.entries();
    }
    keys() {
      consumeTag(collection);
      return vals.keys();
    }
    values() {
      consumeTag(collection);
      return vals.values();
    }
    union<U>(other: ReadonlySetLike<U>): Set<V | U> {
      consumeTag(collection);
      return (vals as any).union(other);
    }
    intersection<U>(other: ReadonlySetLike<U>): Set<V & U> {
      consumeTag(collection);
      return (vals as any).intersection(other);
    }
    difference<U>(other: ReadonlySetLike<U>): Set<V> {
      consumeTag(collection);
      return (vals as any).difference(other);
    }
    symmetricDifference<U>(other: ReadonlySetLike<U>): Set<V | U> {
      consumeTag(collection);
      return (vals as any).symmetricDifference(other);
    }
    isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isSubsetOf(other);
    }
    isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isSupersetOf(other);
    }
    isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isDisjointFrom(other);
    }
    forEach(fn: (v1: V, v2: V, set: Set<V>) => void): void {
      consumeTag(collection);
      vals.forEach((v1, v2) => fn(v1, v2, this));
    }
    get size(): number {
      consumeTag(collection);
      return vals.size;
    }
    [Symbol.iterator](): SetIterator<V> {
      consumeTag(collection);
      return vals[Symbol.iterator]();
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
    add(value: V): this {
      if (vals.has(value)) {
        const isUnchanged = resolved.equals(value, value);
        if (isUnchanged) return this;
      } else {
        dirtyTag(collection);
      }
      dirtyStorageFor(value);
      vals.add(value);
      return this;
    }
    delete(value: V): boolean {
      // Spec: returns false when the value did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/set.ts).
      if (!vals.has(value)) return false;
      dirtyStorageFor(value);
      dirtyTag(collection);
      storages.delete(value);
      return vals.delete(value);
    }
    clear(): void {
      if (vals.size === 0) return;
      storages.forEach((s) => dirtyTag(s));
      dirtyTag(collection);
      storages.clear();
      vals.clear();
    }
  }

  Object.setPrototypeOf(TrackedSetImpl.prototype, Set.prototype);
  return new TrackedSetImpl();
}

// ---- trackedWeakMap -----------------------------------------------------

export function trackedWeakMap<K extends WeakKey = object, V = unknown>(
  data?: WeakMap<K, V> | [K, V][] | Iterable<readonly [K, V]> | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): WeakMap<K, V> {
  const resolved = resolveReactiveOptions<V>(options);
  // NOTE: WeakMap is not iterable, so if we receive one we must wrap it by
  // reference (not clone).
  const vals: WeakMap<K, V> = data instanceof WeakMap ? data : new WeakMap<K, V>(data as any);
  const storages = new WeakMap<K, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: K) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: K) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedWeakMapImpl implements WeakMap<K, V> {
    get(key: K): V | undefined {
      consumeTag(storageFor(key));
      return vals.get(key);
    }
    has(key: K): boolean {
      consumeTag(storageFor(key));
      return vals.has(key);
    }
    set(key: K, value: V): this {
      const existing = vals.get(key);
      if (vals.has(key)) {
        const isUnchanged = resolved.equals(existing as V, value);
        if (isUnchanged) return this;
      }
      dirtyStorageFor(key);
      vals.set(key, value);
      return this;
    }
    delete(key: K): boolean {
      // Spec: returns false when the key did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/weak-map.ts).
      if (!vals.has(key)) return false;
      dirtyStorageFor(key);
      storages.delete(key);
      return vals.delete(key);
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
  }

  Object.setPrototypeOf(TrackedWeakMapImpl.prototype, WeakMap.prototype);
  return new TrackedWeakMapImpl();
}

// ---- trackedWeakSet -----------------------------------------------------

export function trackedWeakSet<V extends WeakKey = object>(
  data?: V[] | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): WeakSet<V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: WeakSet<V> = new WeakSet<V>(data ?? []);
  const storages = new WeakMap<V, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: V) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: V) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedWeakSetImpl implements WeakSet<V> {
    has(value: V): boolean {
      consumeTag(storageFor(value));
      return vals.has(value);
    }
    add(value: V): this {
      if (vals.has(value)) {
        const isUnchanged = resolved.equals(value, value);
        if (isUnchanged) return this;
      }
      vals.add(value);
      dirtyStorageFor(value);
      return this;
    }
    delete(value: V): boolean {
      // Spec: returns false when the value did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/weak-set.ts).
      if (!vals.has(value)) return false;
      dirtyStorageFor(value);
      storages.delete(value);
      return vals.delete(value);
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
  }

  Object.setPrototypeOf(TrackedWeakSetImpl.prototype, WeakSet.prototype);
  return new TrackedWeakSetImpl();
}

// ---- trackedObject ------------------------------------------------------

// Create a tracked object - wraps an object to make all its properties reactive.
// The proxy creates an independent shallow copy of own properties so mutations
// do not leak back to the original object.
export function trackedObject<T extends object>(
  obj?: T,
  options?: {
    equals?: (a: any, b: any) => boolean;
    description?: string;
  }
): T {
  const resolved = resolveReactiveOptions<any>(options);
  if (!obj || typeof obj !== 'object') {
    obj = {} as T;
  }
  // Shallow-copy own enumerable properties into `data`. Getters/setters on the
  // original are transferred as descriptors so `this` inside the getter refers
  // to the proxy.
  const proto = Object.getPrototypeOf(obj);
  const data: Record<string | symbol, any> = Object.create(proto);
  const ownKeys = Reflect.ownKeys(obj);
  for (const key of ownKeys) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc) {
      Object.defineProperty(data, key, desc);
    }
  }

  const storages = new Map<PropertyKey, ReturnType<typeof createUpdatableTag>>();
  const collection = createUpdatableTag();

  const readStorageFor = (key: PropertyKey) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    consumeTag(storage);
  };
  const dirtyStorageFor = (key: PropertyKey) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };
  const dirtyCollection = () => {
    dirtyTag(collection);
  };

  return new Proxy(data as unknown as T, {
    get(target, prop) {
      readStorageFor(prop);
      return (target as any)[prop];
    },
    has(target, prop) {
      readStorageFor(prop);
      return prop in target;
    },
    ownKeys(target) {
      consumeTag(collection);
      return Reflect.ownKeys(target);
    },
    set(target, prop, value) {
      const isUnchanged = resolved.equals((target as any)[prop], value);
      if (isUnchanged) return true;
      (target as any)[prop] = value;
      dirtyStorageFor(prop);
      dirtyCollection();
      // Also fire classic dirtyTagFor for any legacy observers.
      try {
        dirtyTagFor(target as any, prop);
      } catch {
        /* noop */
      }
      return true;
    },
    deleteProperty(target, prop) {
      if (prop in target) {
        delete (target as any)[prop];
        dirtyStorageFor(prop);
        storages.delete(prop);
        dirtyCollection();
      }
      return true;
    },
    getOwnPropertyDescriptor(target, prop) {
      const desc = Reflect.getOwnPropertyDescriptor(target, prop);
      if (desc) {
        desc.configurable = true;
      }
      return desc;
    },
  });
}
