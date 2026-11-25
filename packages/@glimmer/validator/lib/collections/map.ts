/* eslint-disable @typescript-eslint/no-explicit-any */
// Using a Proxy-based approach so that any new methods added to the Map
// interface (like getOrInsert, getOrInsertComputed, etc.) are automatically
// supported without needing to manually re-implement each one.

import { consumeTag, isTracking } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

function isObjectKey(key: unknown): key is object {
  return (typeof key === 'object' && key !== null) || typeof key === 'function';
}

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
  const objectStorages = new WeakMap<object, Tag>();
  const primitiveStorages = new Map<Key, Tag>();
  let hasObjectStorages = false;

  function readStorageFor(key: Key): void {
    if (!isTracking()) {
      return;
    }

    let storage: Tag | undefined;

    if (isObjectKey(key)) {
      storage = objectStorages.get(key);

      if (storage === undefined) {
        storage = createUpdatableTag();
        objectStorages.set(key, storage);
        hasObjectStorages = true;
      }
    } else {
      storage = primitiveStorages.get(key);

      if (storage === undefined) {
        storage = createUpdatableTag();
        primitiveStorages.set(key, storage);
      }
    }

    consumeTag(storage);
  }

  function dirtyStorageFor(key: Key): void {
    const storage = isObjectKey(key) ? objectStorages.get(key) : primitiveStorages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  function deleteStorageFor(key: Key): void {
    if (isObjectKey(key)) {
      objectStorages.delete(key);
    } else {
      primitiveStorages.delete(key);
    }
  }

  const proxy: Map<Key, Value> = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'set') {
        return function (key: Key, value: Value): Map<Key, Value> {
          const hasExisting = target.has(key);

          if (hasExisting) {
            // TS doesn't know about the relationship between has and get
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const isUnchanged = equals(target.get(key)!, value);

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

          deleteStorageFor(key);
          return target.delete(key);
        };
      }

      if (prop === 'clear') {
        return function (): void {
          if (target.size === 0) return;

          // Object keys live in a WeakMap, which can't be enumerated, so walk the
          // entries being removed instead. Tags for absent object keys are left
          // alone: their readers are unaffected by the clear.
          if (hasObjectStorages) {
            for (const key of target.keys()) {
              if (isObjectKey(key)) {
                dirtyStorageFor(key);
                objectStorages.delete(key);
              }
            }
          }

          primitiveStorages.forEach((s) => DIRTY_TAG(s));
          primitiveStorages.clear();

          DIRTY_TAG(collection);
          target.clear();
        };
      }

      if (prop === 'get') {
        return function (key: Key): Value | undefined {
          readStorageFor(key);

          return target.get(key);
        };
      }

      if (prop === 'has') {
        return function (key: Key): boolean {
          readStorageFor(key);

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
