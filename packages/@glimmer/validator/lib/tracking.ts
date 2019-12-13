import { DEBUG } from '@glimmer/env';
import { Tag, combine, createTag, dirty, CONSTANT_TAG } from './validators';
import { tagFor, dirtyTagFor } from './meta';
import { markTagAsConsumed, runInAutotrackingTransaction, assertTagNotConsumed } from './debug';

type Option<T> = T | null;

/**
 * Whenever a tracked computed property is entered, the current tracker is
 * saved off and a new tracker is replaced.
 *
 * Any tracked properties consumed are added to the current tracker.
 *
 * When a tracked computed property is exited, the tracker's tags are
 * combined and added to the parent tracker.
 *
 * The consequence is that each tracked computed property has a tag
 * that corresponds to the tracked properties consumed inside of
 * itself, including child tracked computed properties.
 */
let CURRENT_TRACKER: Option<Tracker> = null;

/**
 * An object that that tracks @tracked properties that were consumed.
 */
class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag) {
    this.tags.add(tag);

    if (DEBUG) {
      markTagAsConsumed!(tag, new Error());
    }

    this.last = tag;
  }

  combine(): Tag {
    let { tags } = this;

    if (tags.size === 0) {
      return CONSTANT_TAG;
    } else if (tags.size === 1) {
      return this.last as Tag;
    } else {
      let tagsArr: Tag[] = [];
      tags.forEach(tag => tagsArr.push(tag));
      return combine(tagsArr);
    }
  }
}

//////////

export function track(callback: () => void, debuggingContext?: string | false): Tag {
  let parent = CURRENT_TRACKER;
  let current = new Tracker();

  CURRENT_TRACKER = current;

  try {
    if (DEBUG) {
      runInAutotrackingTransaction!(callback, debuggingContext);
    } else {
      callback();
    }
  } finally {
    CURRENT_TRACKER = parent;
  }

  return current.combine();
}

export function consume(tag: Tag) {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

export function isTracking() {
  return CURRENT_TRACKER !== null;
}

export function untrack(callback: () => void) {
  let parent = CURRENT_TRACKER;
  CURRENT_TRACKER = null;

  try {
    callback();
  } finally {
    CURRENT_TRACKER = parent;
  }
}

//////////

export const EPOCH = createTag();

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

export let propertyDidChange = function() {};

export function setPropertyDidChange(cb: () => void) {
  propertyDidChange = cb;
}

export function trackedData<T extends object, K extends keyof T>(
  key: K,
  initializer?: () => T[K]
): { getter: Getter<T, K>; setter: Setter<T, K> } {
  let values = new WeakMap<T, T[K]>();
  let hasInitializer = typeof initializer === 'function';

  function getter(self: T) {
    consume(tagFor(self, key));

    let value;

    // If the field has never been initialized, we should initialize it
    if (hasInitializer && !values.has(self)) {
      value = initializer!();
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

    dirty(EPOCH);
    dirtyTagFor(self, key);
    values.set(self, value);
    propertyDidChange();
  }

  return { getter, setter };
}
