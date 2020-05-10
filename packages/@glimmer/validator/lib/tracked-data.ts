import { DEBUG } from '@glimmer/env';
import { tagFor, dirtyTagFor } from './meta';
import { assertTagNotConsumed } from './debug';
import { consumeTag } from './tracking';

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

export function trackedData<T extends object, K extends keyof T>(
  key: K,
  initializer?: (this: T) => T[K]
): { getter: Getter<T, K>; setter: Setter<T, K> } {
  let values = new WeakMap<T, T[K]>();
  let hasInitializer = typeof initializer === 'function';

  function getter(self: T) {
    consumeTag(tagFor(self, key));

    let value;

    // If the field has never been initialized, we should initialize it
    if (hasInitializer && !values.has(self)) {
      value = initializer!.call(self);
      values.set(self, value);
    } else {
      value = values.get(self);
    }

    return value;
  }

  function setter(self: T, value: T[K]): void {
    if (DEBUG) {
      assertTagNotConsumed!(tagFor(self, key), self, key, true);
    }

    dirtyTagFor(self, key);
    values.set(self, value);
  }

  return { getter, setter };
}
