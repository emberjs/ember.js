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
 * A tag of this package. Each tag class declares `slot`:
 * the index of the tag in the tracker that took it last.
 */
interface ConsumedTag extends Tag {
  slot: number;
}

/**
 * An object that tracks @tracked properties that were consumed.
 *
 * Trackers are pooled by frame depth (see `beginTrackFrame`),
 * so a tracker holds no tag after its frame ends.
 */
class Tracker {
  /**
   * The consumed tags. `size` counts the live entries.
   *
   * The array never shrinks, because a write to `length` is a slow path in V8,
   * and this code runs for every frame.
   */
  private tags: (Tag | null)[] = [];
  private size = 0;

  /**
   * A tag keeps the index at which a tracker took it last.
   * If this tracker has the tag at that index, the frame consumed the tag before,
   * so a tag that the frame consumes again costs one comparison.
   *
   * The index can come from another tracker.
   * The entry at that index is then another tag or no tag, and this tracker takes the tag.
   * So a tag that a nested frame takes at another index, between two consumptions
   * of this frame, is taken two times. A combined tag with a duplicate has the same revision.
   */
  add(tag: Tag) {
    if (tag === CONSTANT_TAG) return;

    if (DEBUG) {
      unwrap(debug.markTagAsConsumed)(tag);
    }

    let { tags, size } = this;

    if (tags[(tag as ConsumedTag).slot] === tag) return;

    (tag as ConsumedTag).slot = size;
    tags[size] = tag;
    this.size = size + 1;
  }

  /**
   * `previous` is the tag that this frame produced the last time it ran.
   * If the frame consumed the same tags again, the result is `previous`,
   * which keeps its memoized revision and needs no allocation.
   */
  combine(previous: Tag | undefined): Tag {
    let { tags, size } = this;
    let result: Tag;

    if (size === 0) {
      result = CONSTANT_TAG;
    } else if (size === 1) {
      result = tags[0] as Tag;
    } else if (previous !== undefined && isCombinationOf(previous, tags, size)) {
      result = previous;
    } else {
      result = combine(tags.slice(0, size) as Tag[]);
    }

    this.clear();

    return result;
  }

  clear(): void {
    let { tags, size } = this;

    for (let i = 0; i < size; i++) {
      tags[i] = null;
    }

    this.size = 0;
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
let CURRENT_TRACKER: Tracker | null = null;

const OPEN_TRACK_FRAMES: (Tracker | null)[] = [];

/**
 * Frames are strictly nested, so the tracker of a frame at depth `n` is free
 * when that frame ends. One tracker for each depth is enough.
 */
const TRACKER_POOL: Tracker[] = [];

export function beginTrackFrame(debuggingContext?: string | false): void {
  let depth = OPEN_TRACK_FRAMES.length;

  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);

  let tracker = TRACKER_POOL[depth];

  if (tracker === undefined) {
    tracker = TRACKER_POOL[depth] = new Tracker();
  }

  CURRENT_TRACKER = tracker;

  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(debuggingContext);
  }
}

/**
 * Closes the current frame and returns its combined tag.
 *
 * Pass the tag that the same frame produced the last time it ran.
 * If the frame consumed the same tags again, that tag is the result.
 */
export function endTrackFrame(previous?: Tag): Tag {
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

  for (let tracker of TRACKER_POOL) {
    tracker.clear();
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
      tag = endTrackFrame(tag);
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
