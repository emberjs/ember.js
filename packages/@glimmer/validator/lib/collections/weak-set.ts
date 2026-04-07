// Using a Proxy-based approach so that any new methods added to the WeakSet
// interface are automatically supported without needing to manually
// re-implement each one.

import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

/**
 * NOTE: we cannot pass a WeakSet because WeakSets are not iterable
 */
/**
 * Creates an instanceof WeakSet from an optional list of entries
 *
 */
export function trackedWeakSet<Value extends WeakKey>(
  data?: Value[],
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): WeakSet<Value> {
  const equals = options?.equals ?? Object.is;
  const target = new WeakSet<Value>(data ?? []);
  const storages = new WeakMap<Value, Tag>();

  function storageFor(key: Value): Tag {
    let storage = storages.get(key);

    if (storage === undefined) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }

    return storage;
  }

  function dirtyStorageFor(key: Value): void {
    const storage = storages.get(key);

    if (storage) {
      DIRTY_TAG(storage);
    }
  }

  const proxy: WeakSet<Value> = new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === 'add') {
        return function (value: Value): WeakSet<Value> {
          /**
           * In a WeakSet, there is no `.get()`, but if there was,
           * we could assume it's the same value as what we passed.
           *
           * So for a WeakSet, if we try to add something that already exists
           * we no-op.
           *
           * WeakSet already does this internally for us,
           * but we want the ability for the reactive behavior to reflect the same behavior.
           *
           * i.e.: doing weakSet.add(value) should never dirty with the defaults
           *       if the `value` is already in the weakSet
           */
          if (target.has(value)) {
            /**
             * This looks a little silly, where a always will === b,
             * but see the note above.
             */
            const isUnchanged = equals(value, value);
            if (isUnchanged) return proxy;
          }

          // Add to vals first to get better error message
          target.add(value);

          dirtyStorageFor(value);

          return proxy;
        };
      }

      if (prop === 'delete') {
        return function (value: Value): boolean {
          if (!target.has(value)) return false;

          dirtyStorageFor(value);

          storages.delete(value);
          return target.delete(value);
        };
      }

      if (prop === 'has') {
        return function (value: Value): boolean {
          consumeTag(storageFor(value));

          return target.has(value);
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
