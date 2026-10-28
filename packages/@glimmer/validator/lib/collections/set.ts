/* eslint-disable @typescript-eslint/no-explicit-any */
// Using a Proxy-based approach so that any new methods added to the Set
// interface are automatically supported without needing to manually
// re-implement each one.

import { dirtyTagFor, tagFor } from '../meta';
import { consumeTag } from '../tracking';
import { createUpdatableTag, DIRTY_TAG } from '../validators';

type Tag = ReturnType<typeof createUpdatableTag>;

export function trackedSet<Value = unknown>(
  data?: Set<Value> | Value[] | Iterable<Value> | null,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): Set<Value> {
  const equals = options?.equals ?? Object.is;
  const target = new Set<Value>(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<Value, Tag>();

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

          dirtyTagFor(target, value, storages);

          target.add(value);

          return proxy;
        };
      }

      if (prop === 'delete') {
        return function (value: Value): boolean {
          if (!target.has(value)) return false;

          dirtyTagFor(target, value, storages);
          DIRTY_TAG(collection);

          storages.delete(value);
          return target.delete(value);
        };
      }

      if (prop === 'clear') {
        return function (): void {
          if (target.size === 0) return;

          storages.forEach((s) => DIRTY_TAG(s));
          DIRTY_TAG(collection);

          storages.clear();
          target.clear();
        };
      }

      if (prop === 'has') {
        return function (value: Value): boolean {
          consumeTag(tagFor(target, value, storages));

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
