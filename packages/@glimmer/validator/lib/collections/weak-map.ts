// Using a Proxy-based approach so that any new methods added to the WeakMap
// interface (like getOrInsert, getOrInsertComputed, etc.) are automatically
// supported without needing to manually re-implement each one.

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

export function trackedWeakMap<Key extends WeakKey, Value = unknown>(
  data?: WeakMap<Key, Value> | [Key, Value][] | Iterable<readonly [Key, Value]> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): WeakMap<Key, Value> {
  const equals = options?.equals ?? Object.is;
  const existing = data ?? [];
  /**
   * SAFETY: note that when passing in an existing weak map, we can't
   *         clone it as it is not iterable and not a supported type of structuredClone
   */
  const target: WeakMap<Key, Value> =
    existing instanceof WeakMap ? existing : new WeakMap<Key, Value>(existing);
  const storages = new WeakMap<Key, Tag>();

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

  const proxy: WeakMap<Key, Value> = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'set') {
        return function (key: Key, value: Value): WeakMap<Key, Value> {
          const hasExisting = target.has(key);

          if (hasExisting) {
            const isUnchanged = equals(target.get(key) as Value, value);

            if (isUnchanged) return proxy;
          }

          dirtyStorageFor(key);

          target.set(key, value);

          return proxy;
        };
      }

      if (prop === 'delete') {
        return function (key: Key): boolean {
          if (!target.has(key)) return false;

          dirtyStorageFor(key);

          storages.delete(key);
          return target.delete(key);
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        return value.bind(target);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    },
  });

  return proxy;
}
