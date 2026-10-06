/* eslint-disable @typescript-eslint/no-explicit-any */
// Using a Proxy-based approach so that any new methods added to the Set
// interface are automatically supported without needing to manually
// re-implement each one.

import { consumeTag, createTag, dirtyTag } from '../tags';

type Tag = ReturnType<typeof createTag>;

export function trackedSet<Value = unknown>(
  data?: Set<Value> | Value[] | Iterable<Value> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Set<Value> {
  const equals = options?.equals ?? Object.is;
  const target = new Set<Value>(data ?? []);
  const collection = createTag();
  const storages = new Map<Value, Tag>();

  function storageFor(key: Value): Tag {
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createTag();
      storages.set(key, storage);
    }

    return storage;
  }

  function dirtyStorageFor(key: Value): void {
    const storage = storages.get(key);

    if (storage) {
      dirtyTag(storage);
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
            dirtyTag(collection);
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
          dirtyTag(collection);

          storages.delete(value);
          return target.delete(value);
        };
      }

      if (prop === 'clear') {
        return function (): void {
          if (target.size === 0) return;

          storages.forEach((s) => dirtyTag(s));
          dirtyTag(collection);

          storages.clear();
          target.clear();
        };
      }

      if (prop === 'has') {
        return function (value: Value): boolean {
          consumeTag(storageFor(value));

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
