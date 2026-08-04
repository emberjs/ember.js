import { DEBUG } from '@glimmer/env';
import type { UpdatableTag } from '@glimmer/interfaces';

import { debug } from './debug';
import { consumeTag } from './tracking';
import { unwrap } from './utils';
import { createUpdatableTag, DIRTY_TAG } from './validators';

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

/**
 * Value and tag live in one cell per (field, instance): a read is one
 * WeakMap hop + consumeTag, a write is one hop + DIRTY_TAG. The
 * previous shape went through the central tag registry
 * (`TRACKED_TAGS` WeakMap -> per-object Map) plus a separate values
 * WeakMap -- three map hops on every tracked read and write, which is
 * the hottest path in data-heavy rendering.
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
        tag: createUpdatableTag(),
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

    DIRTY_TAG(cell.tag);
    cell.initialized = true;
    cell.value = value;
  }

  return { getter, setter };
}
