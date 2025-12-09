import type { ReactiveOptions } from './types';

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

class TrackedSet<T = unknown> implements Set<T> {
  #options: ReactiveOptions<T>;
  #collection = createUpdatableTag();
  #storages = new Map<T, ReturnType<typeof createUpdatableTag>>();
  #vals: Set<T>;

  #storageFor(key: T): ReturnType<typeof createUpdatableTag> {
    const storages = this.#storages;
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }

    return storage;
  }

  #dirtyStorageFor(key: T): void {
    const storage = this.#storages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  constructor(existing: Iterable<T>, options: ReactiveOptions<T>) {
    this.#vals = new Set(existing);
    this.#options = options;
  }

  // **** KEY GETTERS ****
  has(value: T): boolean {
    consumeTag(this.#storageFor(value));

    return this.#vals.has(value);
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

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    consumeTag(this.#collection);

    return this.#vals.union(other);
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    consumeTag(this.#collection);

    return this.#vals.intersection(other);
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    consumeTag(this.#collection);

    return this.#vals.difference(other);
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    consumeTag(this.#collection);

    return this.#vals.symmetricDifference(other);
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    consumeTag(this.#collection);

    return this.#vals.isSubsetOf(other);
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    consumeTag(this.#collection);

    return this.#vals.isSupersetOf(other);
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    consumeTag(this.#collection);

    return this.#vals.isDisjointFrom(other);
  }

  forEach(fn: (value1: T, value2: T, set: Set<T>) => void): void {
    consumeTag(this.#collection);

    this.#vals.forEach(fn);
  }

  get size(): number {
    consumeTag(this.#collection);

    return this.#vals.size;
  }

  [Symbol.iterator]() {
    consumeTag(this.#collection);

    return this.#vals[Symbol.iterator]();
  }

  get [Symbol.toStringTag](): string {
    return this.#vals[Symbol.toStringTag];
  }

  add(value: T): this {
    if (this.#vals.has(value)) {
      let isUnchanged = this.#options.equals(value, value);
      if (isUnchanged) return this;
    } else {
      DIRTY_TAG(this.#collection);
    }

    this.#dirtyStorageFor(value);

    this.#vals.add(value);

    return this;
  }

  delete(value: T): boolean {
    if (!this.#vals.has(value)) return true;

    this.#dirtyStorageFor(value);
    DIRTY_TAG(this.#collection);

    this.#storages.delete(value);
    return this.#vals.delete(value);
  }

  // **** ALL SETTERS ****
  clear(): void {
    if (this.#vals.size === 0) return;

    this.#storages.forEach((s) => DIRTY_TAG(s));
    DIRTY_TAG(this.#collection);

    this.#storages.clear();
    this.#vals.clear();
  }
}

// So instanceof works
Object.setPrototypeOf(TrackedSet.prototype, Set.prototype);

export function trackedSet<Value = unknown>(
  data?: Set<Value> | Value[] | Iterable<Value> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Set<Value> {
  return new TrackedSet(data ?? [], {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
