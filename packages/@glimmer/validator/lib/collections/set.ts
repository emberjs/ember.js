/* eslint-disable @typescript-eslint/no-explicit-any */
// Using a Proxy-based approach so that any new methods added to the Set
// interface are automatically supported without needing to manually
// re-implement each one.

import { consumeTag, isTracking } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

function isObjectKey(key: unknown): key is object {
  return (typeof key === 'object' && key !== null) || typeof key === 'function';
}

export function trackedSet<Value = unknown>(
  data?: Set<Value> | Value[] | Iterable<Value> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Set<Value> {
  const equals = options?.equals ?? Object.is;
  const target = new Set<Value>(data ?? []);
  const collection = createUpdatableTag();
  const objectStorages = new WeakMap<object, Tag>();
  const primitiveStorages = new Map<Value, Tag>();
  let hasObjectStorages = false;

  function readStorageFor(key: Value): void {
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

  function dirtyStorageFor(key: Value): void {
    const storage = isObjectKey(key) ? objectStorages.get(key) : primitiveStorages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  function deleteStorageFor(key: Value): void {
    if (isObjectKey(key)) {
      objectStorages.delete(key);
    } else {
      primitiveStorages.delete(key);
    }
  }

  const proxy: Set<Value> = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'add') {
        return function (value: Value): Set<Value> {
          if (target.has(value)) {
            const isUnchanged = equals(value, value);
            if (isUnchanged) return proxy;
          } else {
            DIRTY_TAG(collection);
          }

          dirtyStorageFor(value);

          target.add(value);

          return proxy;
        };
      }

      if (prop === 'delete') {
        return function (value: Value): boolean {
          if (!target.has(value)) return false;

          dirtyStorageFor(value);
          DIRTY_TAG(collection);

          deleteStorageFor(value);
          return target.delete(value);
        };
      }

      if (prop === 'clear') {
        return function (): void {
          if (target.size === 0) return;

          // Object keys live in a WeakMap, which can't be enumerated, so walk the
          // entries being removed instead. Tags for absent object keys are left
          // alone: their readers are unaffected by the clear.
          if (hasObjectStorages) {
            for (const value of target) {
              if (isObjectKey(value)) {
                dirtyStorageFor(value);
                objectStorages.delete(value);
              }
            }
          }

          primitiveStorages.forEach((s) => DIRTY_TAG(s));
          primitiveStorages.clear();

          DIRTY_TAG(collection);
          target.clear();
        };
      }

      if (prop === 'has') {
        return function (value: Value): boolean {
          readStorageFor(value);

          return target.has(value);
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
