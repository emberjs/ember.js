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
 * A tag with the `slot` field that `Tracker#add` reads and writes.
 *
 * Each tag class of this package declares the field,
 * so a tag has it from its construction.
 */
interface ConsumedTag extends Tag {
  slot: number;
}

/**
 * An object that tracks @tracked properties that were consumed.
 *
 * A tracker collects the tags that one tracking frame consumes.
 * When the frame ends, `combine()` makes one tag from them.
 *
 * A tracker is not made for each frame.
 * `beginTrackFrame` takes it from `TRACKER_POOL`, so the next frame
 * at the same depth uses the same tracker again.
 */
class Tracker {
  /**
   * The tags that the current frame consumed.
   * Each tag is at the position of its first consumption.
   * `size` is the number of tags.
   *
   *   tags:  [ a, b, c, null, null ]
   *   size:  3
   *
   * The entries from `size` up are `null`.
   * They are left from an earlier frame that consumed more tags.
   *
   * The array never shrinks.
   * A write to `length` is a slow path in V8, and this code runs for every frame.
   */
  private tags: (Tag | null)[] = [];
  private size = 0;

  /**
   * Adds a tag to the frame, one time.
   *
   * A frame can consume one tag many times,
   * so the tracker must find out if it has the tag already.
   * It does that with no `Set`: the tag keeps the index
   * at which a tracker put it last, in `tag.slot`.
   *
   *   consume a    tags: [ a ]       a.slot = 0
   *   consume b    tags: [ a, b ]    b.slot = 1
   *   consume a    tags[a.slot] is a, so the frame has it. No change.
   *
   * The check is `tags[tag.slot] === tag`.
   * It compares the entry with the tag, so a `slot` that is out of date
   * cannot hide a tag. The worst case is a tag that is in the array two times.
   *
   * That case needs a nested frame.
   * The nested frame has its own tracker, and that tracker also writes `slot`:
   *
   *   1. outer frame consumes a, b    outer tags: [ a, b ]       b.slot = 1
   *   2. inner frame consumes b       inner tags: [ b ]          b.slot = 0
   *   3. outer frame consumes b       outer tags[0] is a, not b.
   *                                   outer tags: [ a, b, b ]    b.slot = 2
   *
   * The duplicate does no harm.
   * The revision of a combined tag is the highest revision of its tags,
   * and a tag that is there two times does not change the highest.
   *
   * If the inner frame puts the tag at the index that the outer frame used,
   * the check of the outer frame still passes, and there is no duplicate.
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

  /**
   * Empties the tracker for the next frame at the same depth.
   *
   *   before:  tags: [ a, b, c ]             size: 3
   *   after:   tags: [ null, null, null ]    size: 0
   *
   * The entries must be `null`, and not only ignored:
   *
   * - an entry that stays is a match for `tags[tag.slot] === tag`,
   *   so the next frame would not add that tag
   * - an entry that stays keeps its tag alive after the frame
   */
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
 * The trackers, by the depth of the frame that uses them.
 * The depth of a frame is the number of frames that are open around it.
 *
 * Frames are strictly nested: a frame ends before the frame around it ends.
 * So two frames at the same depth are never open at the same time,
 * and one tracker for each depth is enough.
 *
 *   frame A              depth 0    TRACKER_POOL[0]
 *   |- frame B           depth 1    TRACKER_POOL[1]
 *   |  `- frame C        depth 2    TRACKER_POOL[2]
 *   `- frame D           depth 1    TRACKER_POOL[1], which B used before
 *
 * A tracker is made the first time that a frame opens at its depth.
 * After that, a frame at that depth allocates no tracker.
 *
 * An untrack frame takes a depth but no tracker, so the pool can have holes:
 *
 *   untrack frame        depth 0    no tracker
 *   `- frame E           depth 1    TRACKER_POOL[1]
 *
 *   TRACKER_POOL:  [ <empty>, tracker ]
 */
const TRACKER_POOL: (Tracker | undefined)[] = [];

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

  /**
   * A frame that did not end left its tags in its tracker.
   * The next frame at that depth must start with no tag.
   *
   * The pool can have holes, see `TRACKER_POOL`.
   */
  for (let tracker of TRACKER_POOL) {
    if (tracker !== undefined) {
      tracker.clear();
    }
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
