import { DEBUG } from '@glimmer/env';
import { Tag, combine, CONSTANT_TAG, validateTag, Revision, valueForTag } from './validators';
import { tagFor, dirtyTagFor } from './meta';
import { markTagAsConsumed, runInAutotrackingTransaction, assertTagNotConsumed } from './debug';

type Option<T> = T | null;

/**
 * An object that that tracks @tracked properties that were consumed.
 */
class Tracker {
  private tags = new Set<Tag>();
  private last: Option<Tag> = null;

  add(tag: Tag) {
    this.tags.add(tag);

    if (DEBUG) {
      markTagAsConsumed!(tag);
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

const OPEN_TRACK_FRAMES: Option<Tracker>[] = [];

export function beginTrackFrame(): void {
  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);

  CURRENT_TRACKER = new Tracker();
}

export function endTrackFrame(): Tag {
  let current = CURRENT_TRACKER;

  if (DEBUG && OPEN_TRACK_FRAMES.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }

  CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop()!;

  return current!.combine();
}

//////////

const IS_CONST_MAP: WeakMap<object, boolean | undefined> = new WeakMap();

export function memo<T>(cb: () => T, context?: string | false): () => T;
export function memo<T, U>(cb: (a1: U) => T, context?: string | false): (a1: U) => T;
export function memo<T, U, V, W>(
  cb: (a1: U, a2: V, a3: W) => T,
  context?: string | false
): (a1: U, a2: V, a3: W) => T;
export function memo<T, U, V, W, X>(
  cb: (a1: U, a2: V, a3: W, a4: X) => T,
  context?: string | false
): (a1: U, a2: V, a3: W, a4: X) => T;
export function memo<T, U, V, W, X, Y>(
  cb: (a1: U, a2: V, a3: W, a4: X, a5: Y) => T,
  context?: string | false
): (a1: U, a2: V, a3: W, a4: X, a5: Y) => T;
export function memo<T, U, V, W, X, Y, Z>(
  cb: (a1: U, a2: V, a3: W, a4: X, a5: Y, a6: Z) => T,
  context?: string | false
): (a1: U, a2: V, a3: W, a4: X, a5: Y, a6: Z) => T;

export function memo<T>(callback: (...args: unknown[]) => T, debuggingContext?: string | false) {
  let lastValue: T | undefined;
  let tag: Tag;
  let snapshot: Revision;

  let memoized = (...args: unknown[]): T => {
    if (!tag || !validateTag(tag, snapshot)) {
      beginTrackFrame();

      try {
        if (DEBUG) {
          runInAutotrackingTransaction!(() => (lastValue = callback(...args)), debuggingContext);
        } else {
          lastValue = callback(...args);
        }
      } finally {
        tag = endTrackFrame();
        snapshot = valueForTag(tag);
        consumeTag(tag);

        // If the final tag is constant, then we know for sure that this
        // memoized function can never change. There are times when this
        // information is useful externally (i.e. in the append VM, it tells us
        // whether or not to emit opcodes) so we expose it via a metadata weakmap.
        if (tag === CONSTANT_TAG) {
          IS_CONST_MAP.set(memoized, true);
        } else if (DEBUG) {
          // In DEBUG, set the value to false explicitly. This way we can throw
          // if someone attempts to call `isConst(memoized)` before running
          // `memoized()` at least once.
          IS_CONST_MAP.set(memoized, false);
        }
      }
    } else {
      consumeTag(tag);
    }

    return lastValue!;
  };

  if (DEBUG) {
    IS_CONST_MAP.set(memoized, undefined);
  }

  return memoized;
}

export function isConstMemo(memoized: Function) {
  if (DEBUG && IS_CONST_MAP.has(memoized) && IS_CONST_MAP.get(memoized) === undefined) {
    throw new Error(
      'Attempted to call `isConstMemo` on a memoized function, but the function has not been run at least once yet. You cannot know if a memoized function is constant or not until it has been run at least once. Call the function, then pass it to `isConstMemo`.'
    );
  }

  return IS_CONST_MAP.get(memoized) === true;
}

//////////

export function track(callback: () => void, debuggingContext?: string | false): Tag {
  beginTrackFrame();

  let tag;

  try {
    if (DEBUG) {
      runInAutotrackingTransaction!(callback, debuggingContext);
    } else {
      callback();
    }
  } finally {
    tag = endTrackFrame();
  }

  return tag;
}

export function consumeTag(tag: Tag) {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

export function isTracking() {
  return CURRENT_TRACKER !== null;
}

export function untrack(callback: () => void) {
  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);
  CURRENT_TRACKER = null;

  try {
    callback();
  } finally {
    CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop()!;
  }
}

//////////

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
