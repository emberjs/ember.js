/* eslint-disable @typescript-eslint/no-explicit-any */
// Using a Proxy-based approach so that any new methods added to the Map
// interface (like getOrInsert, getOrInsertComputed, etc.) are automatically
// supported without needing to manually re-implement each one.

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

export function trackedMap<Key = any, Value = any>(
  data?:
    | Map<Key, Value>
    | Iterable<readonly [Key, Value]>
    | readonly (readonly [Key, Value])[]
    | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Map<Key, Value> {
  const equals = options?.equals ?? Object.is;
  // TypeScript doesn't correctly resolve the overloads for calling the `Map`
  // constructor for the no-value constructor. This resolves that.
  const target: Map<Key, Value> =
    data instanceof Map ? new Map(data.entries()) : new Map(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<Key, Tag>();

  function storageFor(key: Key): Tag {
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }

    return storage;
  }

  function dirtyStorageFor(key: Key): void {
    const storage = storages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  const proxy: Map<Key, Value> = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'set') {
        return function (key: Key, value: Value): Map<Key, Value> {
          const hasExisting = target.has(key);

          if (hasExisting) {
            const isUnchanged = equals(target.get(key) as Value, value);

            if (isUnchanged) return proxy;
          }

          dirtyStorageFor(key);
          DIRTY_TAG(collection);

          target.set(key, value);

          return proxy;
        };
      }

      if (prop === 'delete') {
        return function (key: Key): boolean {
          if (!target.has(key)) return false;

          dirtyStorageFor(key);
          DIRTY_TAG(collection);

          storages.delete(key);
          return target.delete(key);
        };
      }

      if (prop === 'clear') {
        return function (): void {
          if (target.size === 0) return;

          storages.forEach((s) => DIRTY_TAG(s));
          storages.clear();

          DIRTY_TAG(collection);
          target.clear();
        };
      }

      if (prop === 'get') {
        return function (key: Key): Value | undefined {
          consumeTag(storageFor(key));

          return target.get(key);
        };
      }

      if (prop === 'has') {
        return function (key: Key): boolean {
          consumeTag(storageFor(key));

          return target.has(key);
        };
      }

      if (prop === 'size') {
        consumeTag(collection);

        return target.size;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        return function (this: any, ...args: any[]) {
          consumeTag(collection);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          return value.apply(target, args);
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    },
  });

  return proxy;
}
