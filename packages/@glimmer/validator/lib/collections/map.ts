import type { ReactiveOptions } from './types';

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

class TrackedMap<K = unknown, V = unknown> implements Map<K, V> {
  #options: ReactiveOptions<V>;
  #collection = createUpdatableTag();
  #storages = new Map<K, ReturnType<typeof createUpdatableTag>>();
  #vals: Map<K, V>;

  #storageFor(key: K): ReturnType<typeof createUpdatableTag> {
    const storages = this.#storages;
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }

    return storage;
  }
  #dirtyStorageFor(key: K): void {
    const storage = this.#storages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  constructor(
    existing: readonly (readonly [K, V])[] | Iterable<readonly [K, V]> | null | Map<K, V>,
    options: ReactiveOptions<V>
  ) {
    // TypeScript doesn't correctly resolve the overloads for calling the `Map`
    // constructor for the no-value constructor. This resolves that.
    this.#vals = existing instanceof Map ? new Map(existing.entries()) : new Map(existing);
    this.#options = options;
  }

  get(key: K): V | undefined {
    consumeTag(this.#storageFor(key));

    return this.#vals.get(key);
  }

  has(key: K): boolean {
    consumeTag(this.#storageFor(key));

    return this.#vals.has(key);
  }

  // **** ALL GETTERS ****
  entries() {
    consumeTag(this.#collection);

    return this.#vals.entries();
  }

  keys() {
    consumeTag(this.#collection);

    return this.#vals.keys();
  }

  values() {
    consumeTag(this.#collection);

    return this.#vals.values();
  }

  forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void {
    consumeTag(this.#collection);

    this.#vals.forEach(fn);
  }

  get size(): number {
    consumeTag(this.#collection);

    return this.#vals.size;
  }

  /**
   * When iterating:
   * - we entangle with the collection (as we iterate over the whole thing
   * - for each individual item, we entangle with the item as well
   */
  [Symbol.iterator]() {
    let keys = this.keys();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let self = this;

    return {
      next() {
        let next = keys.next();
        let currentKey = next.value;

        if (next.done) {
          return { value: [undefined, undefined], done: true };
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { value: [currentKey, self.get(currentKey!)], done: false };
      },
    } as MapIterator<[K, V]>;
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  set(key: K, value: V): this {
    let existing = this.#vals.get(key);

    if (existing) {
      let isUnchanged = this.#options.equals(existing, value);

      if (isUnchanged) {
        return this;
      }
    }

    this.#dirtyStorageFor(key);

    if (!existing) {
      DIRTY_TAG(this.#collection);
    }

    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    if (!this.#vals.has(key)) return true;

    this.#dirtyStorageFor(key);
    DIRTY_TAG(this.#collection);

    this.#storages.delete(key);
    return this.#vals.delete(key);
  }

  clear(): void {
    if (this.#vals.size === 0) return;

    this.#storages.forEach((s) => DIRTY_TAG(s));
    this.#storages.clear();

    DIRTY_TAG(this.#collection);
    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedMap.prototype, Map.prototype);

export function trackedMap<Key = unknown, Value = unknown>(
  data?:
    | Map<Key, Value>
    | Iterable<readonly [Key, Value]>
    | readonly (readonly [Key, Value])[]
    | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Map<Key, Value> {
  return new TrackedMap(data ?? [], {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
