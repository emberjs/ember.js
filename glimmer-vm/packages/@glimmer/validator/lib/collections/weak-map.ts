import type { ReactiveOptions } from './types';

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

class TrackedWeakMap<K extends WeakKey = object, V = unknown> implements WeakMap<K, V> {
  #options: ReactiveOptions<V>;
  #storages = new WeakMap<K, ReturnType<typeof createUpdatableTag>>();
  #vals: WeakMap<K, V>;

  #storageFor(key: K): ReturnType<typeof createUpdatableTag> {
    let storage = this.#storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      this.#storages.set(key, storage);
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
    existing: [K, V][] | Iterable<readonly [K, V]> | WeakMap<K, V>,
    options: ReactiveOptions<V>
  ) {
    /**
     * SAFETY: note that wehn passing in an existing weak map, we can't
     *         clone it as it is not iterable and not a supported type of structuredClone
     */
    this.#vals = existing instanceof WeakMap ? existing : new WeakMap<K, V>(existing);
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

  set(key: K, value: V): this {
    let existing = this.#vals.get(key);

    if (existing) {
      let isUnchanged = this.#options.equals(existing, value);

      if (isUnchanged) {
        return this;
      }
    }

    this.#dirtyStorageFor(key);

    this.#vals.set(key, value);

    return this;
  }

  delete(key: K): boolean {
    if (!this.#vals.has(key)) return true;

    this.#dirtyStorageFor(key);

    this.#storages.delete(key);
    return this.#vals.delete(key);
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedWeakMap.prototype, WeakMap.prototype);

export function trackedWeakMap<Key extends WeakKey, Value = unknown>(
  data?: WeakMap<Key, Value> | [Key, Value][] | Iterable<readonly [Key, Value]> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): WeakMap<Key, Value> {
  return new TrackedWeakMap<Key, Value>(data ?? [], {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
