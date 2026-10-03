import { DEBUG } from '@glimmer/env';
import type { UpdatableTag } from '@glimmer/interfaces';

import { debug } from './debug';
import { tagFor } from './meta';
import { consumeTag } from './tracking';
import { unwrap } from './utils';
import { DIRTY_TAG } from './validators';

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

/**
 * The value and the tag of one field of one instance. A read or a write
 * finds both with one WeakMap lookup.
 *
 * The tag is the one that the tag registry has for the field, so `tagFor`
 * and `dirtyTagFor` work on the same tag as the field.
 */
interface TrackedCell<V> {
  value: V;
  tag: UpdatableTag;
  initialized: boolean;
}

export function trackedData<T extends object, K extends keyof T>(
  key: K,
  initializer?: (this: T) => T[K]
): { getter: Getter<T, K>; setter: Setter<T, K> } {
  let cells = new WeakMap<T, TrackedCell<T[K] | undefined>>();
  let hasInitializer = typeof initializer === 'function';

  function cellFor(self: T): TrackedCell<T[K] | undefined> {
    let cell = cells.get(self);

    if (cell === undefined) {
      cell = {
        value: undefined,
        // Other code can ask the registry for this tag before the first read
        // or write of the field, so the cell takes the tag from there.
        tag: tagFor(self, key) as UpdatableTag,
        initialized: !hasInitializer,
      };
      cells.set(self, cell);
    }

    return cell;
  }

  function getter(self: T) {
    const cell = cellFor(self);

    consumeTag(cell.tag);

    // If the field has never been initialized, we should initialize it
    if (!cell.initialized) {
      cell.initialized = true;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by initialized
      cell.value = initializer!.call(self);
    }

    return cell.value;
  }

  function setter(self: T, value: T[K]): void {
    const cell = cellFor(self);

    if (DEBUG) {
      unwrap(debug.assertTagNotConsumed)(cell.tag, self, key);
    }

    DIRTY_TAG(cell.tag, true);
    cell.initialized = true;
    cell.value = value;
  }

  return { getter, setter };
}
