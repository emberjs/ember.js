import { DEBUG } from '@glimmer/env';
import type { Tag } from '@glimmer/interfaces';

import type { Revision } from './validators';

import { debug } from './debug';
import { unwrap } from './utils';
import {
  combine,
  CONSTANT_TAG,
  isCombinationOf,
  isConstTag,
  validateTag,
  valueForTag,
} from './validators';

/**
 * An object that tracks @tracked properties that were consumed.
 *
 * Trackers are pooled by frame depth (see `beginTrackFrame`), so a tracker
 * must not keep any reference to a previous frame's tags after `reset()`, and
 * `combine()` must copy its list before handing it to a tag.
 */
class Tracker {
  /**
   * Consumed tags, deduplicated by a linear scan while the frame is small.
   * `size` counts the live entries; the array is never shrunk, because
   * setting `length` is a slow path in V8 and this runs on every frame.
   */
  private tags: (Tag | null)[] = [];
  private size = 0;
  /** Takes over from `tags` once a frame consumes more than a handful of tags. */
  private set: Set<Tag> | null = null;
  private last: Tag | null = null;

  reset(): void {
    let { tags, size } = this;

    for (let i = 0; i < size; i++) {
      tags[i] = null;
    }

    this.size = 0;
    this.set = null;
    this.last = null;
  }

  add(tag: Tag) {
    if (tag === CONSTANT_TAG) return;

    if (DEBUG) {
      unwrap(debug.markTagAsConsumed)(tag);
    }

    this.last = tag;

    let { set } = this;

    if (set !== null) {
      set.add(tag);
      return;
    }

    let { tags, size } = this;

    for (let i = 0; i < size; i++) {
      if (tags[i] === tag) return;
    }

    if (size < SMALL_FRAME) {
      tags[size] = tag;
      this.size = size + 1;
    } else {
      set = this.set = new Set(tags as Tag[]);
      set.add(tag);
    }
  }

  /**
   * `previous` is the tag this frame produced last time. When the frame
   * consumed the same tags again, it is returned as is.
   */
  combine(previous: Tag | null): Tag {
    let { set } = this;

    if (set !== null) {
      let tags = Array.from(set);

      if (previous !== null && isCombinationOf(previous, tags, tags.length)) {
        return previous;
      }

      return combine(tags);
    }

    let { tags, size } = this;

    if (size === 0) {
      return CONSTANT_TAG;
    } else if (size === 1) {
      return this.last as Tag;
    }

    if (previous !== null && isCombinationOf(previous, tags, size)) {
      return previous;
    }

    return combine(tags.slice(0, size) as Tag[]);
  }
}

const SMALL_FRAME = 16;

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
let CURRENT_TRACKER: Tracker | null = null;

const OPEN_TRACK_FRAMES: (Tracker | null)[] = [];

/**
 * Frames are strictly nested, so the tracker for a frame at depth `n` is free
 * again as soon as that frame ends. One tracker per depth is enough, and no
 * frame allocates a tracker after the first time its depth is reached.
 */
const TRACKER_POOL: Tracker[] = [];

export function beginTrackFrame(debuggingContext?: string | false): void {
  let depth = OPEN_TRACK_FRAMES.length;

  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);

  let tracker = TRACKER_POOL[depth];

  if (tracker === undefined) {
    tracker = TRACKER_POOL[depth] = new Tracker();
  } else {
    tracker.reset();
  }

  CURRENT_TRACKER = tracker;

  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(debuggingContext);
  }
}

/**
 * Close the current frame and return its combined tag. Pass the tag the same
 * frame produced last time to get it back unchanged when the consumed tags
 * did not change.
 */
export function endTrackFrame(previous: Tag | null = null): Tag {
  let current = CURRENT_TRACKER;

  if (DEBUG) {
    if (OPEN_TRACK_FRAMES.length === 0) {
      throw new Error('attempted to close a tracking frame, but one was not open');
    }

    unwrap(debug.endTrackingTransaction)();
  }

  CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop() || null;

  return unwrap(current).combine(previous);
}

export function beginUntrackFrame(): void {
  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);
  CURRENT_TRACKER = null;
}

export function endUntrackFrame(): void {
  if (DEBUG && OPEN_TRACK_FRAMES.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }

  CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop() || null;
}

// This function is only for handling errors and resetting to a valid state
export function resetTracking(): string | void {
  while (OPEN_TRACK_FRAMES.length > 0) {
    OPEN_TRACK_FRAMES.pop();
  }

  CURRENT_TRACKER = null;

  if (DEBUG) {
    return unwrap(debug.resetTrackingTransaction)();
  }
}

export function isTracking(): boolean {
  return CURRENT_TRACKER !== null;
}

export function consumeTag(tag: Tag): void {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

//////////

const CACHE_KEY = Symbol('CACHE_KEY');

// public interface
export interface Cache<T = unknown> {
  [CACHE_KEY]: T;
}

const FN = Symbol('FN');
const LAST_VALUE = Symbol('LAST_VALUE');
const TAG = Symbol('TAG');
const SNAPSHOT = Symbol('SNAPSHOT');
const DEBUG_LABEL = Symbol('DEBUG_LABEL');

interface InternalCache<T = unknown> {
  [FN]: (...args: unknown[]) => T;
  [LAST_VALUE]: T | undefined;
  [TAG]: Tag | undefined;
  [SNAPSHOT]: Revision;
  [DEBUG_LABEL]?: string | false | undefined;
}

export function createCache<T>(fn: () => T, debuggingLabel?: string | false): Cache<T> {
  if (DEBUG && !(typeof fn === 'function')) {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }

  let cache: InternalCache<T> = {
    [FN]: fn,
    [LAST_VALUE]: undefined,
    [TAG]: undefined,
    [SNAPSHOT]: -1,
  };

  if (DEBUG) {
    cache[DEBUG_LABEL] = debuggingLabel;
  }

  return cache as unknown as Cache<T>;
}

export function getValue<T>(cache: Cache<T>): T | undefined {
  assertCache(cache, 'getValue');

  let fn = cache[FN];
  let tag = cache[TAG];
  let snapshot = cache[SNAPSHOT];

  if (tag === undefined || !validateTag(tag, snapshot)) {
    beginTrackFrame();

    try {
      cache[LAST_VALUE] = fn();
    } finally {
      tag = endTrackFrame();
      cache[TAG] = tag;
      cache[SNAPSHOT] = valueForTag(tag);
      consumeTag(tag);
    }
  } else {
    consumeTag(tag);
  }

  return cache[LAST_VALUE];
}

export function isConst(cache: Cache): boolean {
  assertCache(cache, 'isConst');

  let tag = cache[TAG];

  assertTag(tag, cache);

  return isConstTag(tag);
}

function assertCache<T>(
  value: Cache<T> | InternalCache<T>,
  fnName: string
): asserts value is InternalCache<T> {
  if (DEBUG && !(typeof value === 'object' && FN in value)) {
    throw new Error(
      `${fnName}() can only be used on an instance of a cache created with createCache(). Called with: ${String(
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
        value
      )}`
    );
  }
}

// replace this with `expect` when we can
function assertTag(tag: Tag | undefined, cache: InternalCache): asserts tag is Tag {
  if (DEBUG && tag === undefined) {
    throw new Error(
      `isConst() can only be used on a cache once getValue() has been called at least once. Called with cache function:\n\n${String(
        cache[FN]
      )}`
    );
  }
}

//////////

// Legacy tracking APIs

// track() shouldn't be necessary at all in the VM once the autotracking
// refactors are merged, and we should generally be moving away from it. It may
// be necessary in Ember for a while longer, but I think we'll be able to drop
// it in favor of cache sooner rather than later.
export function track(block: () => void, debugLabel?: string | false): Tag {
  beginTrackFrame(debugLabel);

  let tag;

  try {
    block();
  } finally {
    tag = endTrackFrame();
  }

  return tag;
}

// untrack() is currently mainly used to handle places that were previously not
// tracked, and that tracking now would cause backtracking rerender assertions.
// I think once we move everyone forward onto modern APIs, we'll probably be
// able to remove it, but I'm not sure yet.
export function untrack<T>(callback: () => T): T {
  beginUntrackFrame();

  try {
    return callback();
  } finally {
    endUntrackFrame();
  }
}
