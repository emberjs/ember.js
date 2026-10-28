// gxt NATIVE layer — alias target for `@glimmer/validator` and its deep paths
// (`lib/{tracking,validators,meta,tracked-data,utils,debug}`). The vendored
// `lib/collections/*` stay real (they import `../tracking` / `../validators`,
// which the native resolved-path guard redirects HERE) and are re-exported.
//
// ONE reactive system: an Ember tag IS a gxt cell.
//   - Leaf tags (`tagFor`, `createTag`, `createUpdatableTag`) are gxt `Cell`s.
//     `tagFor(obj, key)` is gxt's per-(obj, key) cell in `cellsMap` — the same
//     store gxt `tracked`/`cellFor` use. `valueForTag(cell)` is `cell._revision`,
//     `CURRENT_TAG` is gxt's global revision, `DIRTY_TAG` is gxt `dirtyCell`
//     (always invalidates; schedules the gxt drain only for subscribed cells).
//   - Tracking frames ARE gxt trackers (`setTracker(new Set())`): a gxt cell
//     read inside an Ember frame is captured, and `consumeTag` inside a gxt
//     render formula subscribes that formula. gxt trackers hold only leaf
//     cells, so `consumeTag` flattens combinator / updatable tags to leaves.
//   - The only non-cell tags are tiny combinators (`combine`, CONSTANT /
//     VOLATILE / CURRENT) whose value is the max over their members, and the
//     `updateTag` subtag slot of an updatable leaf (metal computed / alias /
//     chain tags), kept in a WeakMap with Glimmer's buffering semantics.
//   - `@tracked` storage (`trackedData`) keeps the value IN the tag cell; the
//     gxt `UNSET` sentinel marks "not initialized" so `tagFor` never has to read
//     the property (the recursion hazard documented in metal's tracked.ts).
// There is no separate revision counter, tag store or reactor list.
import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import getDebugName from '@ember/-internals/utils/lib/get-debug-name';
import {
  cell,
  currentRevision,
  dirtyCell,
  entangleSubscribers,
  getTracker,
  peekTagFor,
  setTracker,
  tagFor as gxtTagFor,
  tagMetaFor as gxtTagMetaFor,
  UNSET,
  type Cell,
} from '@lifeart/gxt';

export { trackedArray } from '@glimmer/validator/lib/collections/array';
export { trackedMap } from '@glimmer/validator/lib/collections/map';
export { trackedObject } from '@glimmer/validator/lib/collections/object';
export { trackedSet } from '@glimmer/validator/lib/collections/set';
export { trackedWeakMap } from '@glimmer/validator/lib/collections/weak-map';
export { trackedWeakSet } from '@glimmer/validator/lib/collections/weak-set';
export { TrackedValue, trackedValue } from '@glimmer/validator/lib/tracked-value';

export type Revision = number;

export const CONSTANT: Revision = 0;
export const INITIAL: Revision = 1;
export const VOLATILE: Revision = NaN;

export const COMPUTE: unique symbol = Symbol('TAG_COMPUTE');

type Leaf = Cell<unknown>;
type Tracker = Set<Leaf>;

/** Non-cell tags: combinators and the CONSTANT / VOLATILE / CURRENT singletons. */
abstract class NativeTag {
  abstract [COMPUTE](): Revision;
}

export type Tag = Leaf | NativeTag;
export type DirtyableTag = Leaf;
export type UpdatableTag = Leaf;
export type CombinatorTag = NativeTag;
export type ConstantTag = NativeTag;

// DEBUG-only: metal marks intentionally self-referential tags (alias/computed
// chains) here; a cycle on any other tag is an error, as in Glimmer.
export const ALLOW_CYCLES: WeakMap<Tag, boolean> | undefined = DEBUG ? new WeakMap() : undefined;

// DEBUG-only: `createTag()` cells are dirtyable but not updatable.
const DIRTYABLE_ONLY: WeakSet<Leaf> | undefined = DEBUG ? new WeakSet() : undefined;

// The `updateTag` slot of an updatable leaf, with Glimmer's buffer cache: the
// subtag's revision at update time is remembered so swapping the subtag does
// not by itself invalidate the tag (validators.ts UPDATE_TAG rationale).
class Subtag {
  subtag: Tag | null;
  buffer: Revision | null;
  lastChecked = -1;
  isUpdating = false;
  constructor(
    subtag: Tag,
    buffer: Revision,
    public lastValue: Revision
  ) {
    this.subtag = subtag;
    this.buffer = buffer;
  }

  compute(leaf: Leaf): Revision {
    if (this.isUpdating) {
      if (DEBUG && !ALLOW_CYCLES?.has(leaf)) throw new Error('Cycles in tags are not allowed');
      return this.lastValue;
    }
    const now = currentRevision();
    if (this.lastChecked !== now) {
      this.isUpdating = true;
      this.lastChecked = now;
      try {
        let revision = leaf._revision;
        const subtag = this.subtag;
        if (subtag !== null) {
          const subValue = valueForTag(subtag);
          if (subValue === this.buffer) {
            revision = Math.max(revision, this.lastValue);
          } else {
            this.buffer = null;
            revision = Math.max(revision, subValue);
          }
        }
        this.lastValue = revision;
      } finally {
        this.isUpdating = false;
      }
    }
    return this.lastValue;
  }
}

const SUBTAGS = new WeakMap<Leaf, Subtag>();

class Combinator extends NativeTag {
  lastChecked = -1;
  lastValue: Revision = CONSTANT;
  constructor(public tags: Tag[]) {
    super();
  }
  [COMPUTE](): Revision {
    const now = currentRevision();
    if (this.lastChecked !== now) {
      this.lastChecked = now;
      let revision = CONSTANT;
      for (const tag of this.tags) revision = Math.max(revision, valueForTag(tag));
      this.lastValue = revision;
    }
    return this.lastValue;
  }
}

class ConstantTagImpl extends NativeTag {
  [COMPUTE](): Revision {
    return CONSTANT;
  }
}

export class VolatileTag extends NativeTag {
  [COMPUTE](): Revision {
    return VOLATILE;
  }
}

export class CurrentTag extends NativeTag {
  [COMPUTE](): Revision {
    return currentRevision();
  }
}

export const CONSTANT_TAG: ConstantTag = new ConstantTagImpl();
export const VOLATILE_TAG = new VolatileTag();
export const CURRENT_TAG = new CurrentTag();

export function isConstTag(tag: Tag): boolean {
  return tag === CONSTANT_TAG;
}

export function valueForTag(tag: Tag): Revision {
  if (tag instanceof NativeTag) return tag[COMPUTE]();
  const sub = SUBTAGS.get(tag);
  return sub === undefined ? tag._revision : sub.compute(tag);
}

export function validateTag(tag: Tag, snapshot: Revision): boolean {
  return snapshot >= valueForTag(tag);
}

export function createTag(): DirtyableTag {
  const tag = cell<unknown>(undefined);
  if (DEBUG) DIRTYABLE_ONLY!.add(tag);
  return tag;
}

export function createUpdatableTag(): UpdatableTag {
  return cell<unknown>(undefined);
}

export function DIRTY_TAG(tag: Tag, disableConsumptionAssertion?: boolean): void {
  if (DEBUG && tag instanceof NativeTag) {
    throw new Error('Attempted to dirty a tag that was not dirtyable');
  }
  if (DEBUG && disableConsumptionAssertion !== true) debug.assertTagNotConsumed!(tag);
  dirtyCell(tag as Leaf);
}

export function UPDATE_TAG(tag: Tag, subtag: Tag): void {
  if (DEBUG && (tag instanceof NativeTag || DIRTYABLE_ONLY!.has(tag))) {
    throw new Error('Attempted to update a tag that was not updatable');
  }
  const leaf = tag as Leaf;
  let sub = SUBTAGS.get(leaf);
  if (subtag === CONSTANT_TAG) {
    if (sub !== undefined) sub.subtag = null;
    return;
  }
  // Buffer the subtag's CURRENT revision (see Subtag). A first update keeps the
  // value the tag had so far (its own revision) as the buffered last value.
  const buffer = valueForTag(subtag);
  if (sub === undefined) {
    SUBTAGS.set(leaf, new Subtag(subtag, buffer, leaf._revision));
    // gxt bindings that consumed this tag BEFORE it had a subtag (the property
    // tag of an alias / computed read for the first time AFTER a binding
    // consumed it — LinkTo's `href` consumes `tagFor(routing, 'currentState')`
    // before anything read the `currentState` alias) flattened it without the
    // subtag: subscribe them to its leaves now (Glimmer validates updatable
    // tags lazily, so its consumers see a late subtag).
    entangleSubscribers(leaf, leavesOf(subtag, new Set()));
  } else {
    sub.buffer = buffer;
    sub.subtag = subtag;
  }
}

export { DIRTY_TAG as dirtyTag, UPDATE_TAG as updateTag };

// The leaf cells a tag stands for (combinator members, subtags; cycle-safe).
function leavesOf(tag: Tag, out: Set<Leaf>): Set<Leaf> {
  if (tag instanceof NativeTag) {
    if (tag instanceof Combinator) for (const member of tag.tags) leavesOf(member, out);
    return out;
  }
  if (out.has(tag)) return out;
  out.add(tag);
  const sub = SUBTAGS.get(tag);
  if (sub !== undefined && sub.subtag !== null) leavesOf(sub.subtag, out);
  return out;
}

export function combine(tags: Tag[]): Tag {
  switch (tags.length) {
    case 0:
      return CONSTANT_TAG;
    case 1:
      return tags[0] as Tag;
    default:
      return new Combinator(tags);
  }
}

/** Advance the global revision without changing any tag (Glimmer `bump`). */
const BUMP_TAG = cell<unknown>(undefined);
export function bump(): void {
  dirtyCell(BUMP_TAG);
}

// ---------------------------------------------------------------- tracking

// Add `tag`'s leaf cells to a gxt tracker. CONSTANT / VOLATILE / CURRENT have
// no leaf to subscribe to (only Glimmer-VM internals consume them).
function addLeaves(tracker: Tracker, tag: Tag): void {
  if (tag instanceof NativeTag) {
    if (tag instanceof Combinator) {
      for (const member of tag.tags) addLeaves(tracker, member);
    }
    return;
  }
  const sub = SUBTAGS.get(tag);
  if (sub === undefined) {
    tracker.add(tag);
  } else if (!tracker.has(tag)) {
    // the `has` guard also terminates subtag cycles (ALLOW_CYCLES tags)
    tracker.add(tag);
    if (sub.subtag !== null) addLeaves(tracker, sub.subtag);
  }
}

function combineTracker(tracker: Tracker): Tag {
  switch (tracker.size) {
    case 0:
      return CONSTANT_TAG;
    case 1:
      return tracker.values().next().value as Leaf;
    default:
      return new Combinator(Array.from(tracker));
  }
}

/**
 * Whether `tag` is a combinator of exactly the leaves of `tracker`, in their
 * order (Glimmer's `isCombinationOf`). Such a combinator is the tag
 * `combineTracker(tracker)` would make: same members, so same revisions.
 */
function isCombinationOf(tag: Tag | null | undefined, tracker: Tracker): tag is Combinator {
  if (!(tag instanceof Combinator)) return false;
  const members = tag.tags;
  if (members.length !== tracker.size) return false;
  let i = 0;
  for (const leaf of tracker) {
    if (leaf !== members[i++]) return false;
  }
  return true;
}

// The last combinator `consumeTag` added to a frame while an Ember frame is
// open, and the gxt tracker it went into. A frame that consumed only that
// combinator's leaves ends with that combinator, as Glimmer's frame that
// consumed one tag ends with that tag: a frame that reads one cache gets the
// cache's tag. Reset when a frame ends, so it holds nothing once the frames
// are closed.
let LAST_COMBINATOR: Combinator | null = null;
let LAST_COMBINATOR_TRACKER: Tracker | null = null;

/**
 * The tag of a frame that ends with the leaves of `tracker`.
 *
 * `previous` is the tag the frame's cache got on its last run (`getValue`):
 * a cache that consumed the same tags again, in the same order, keeps its tag
 * (and its memoized revision), as Glimmer's `combineForCache` does. Every
 * other frame has no previous tag.
 */
function frameTag(tracker: Tracker, previous: Tag | undefined): Tag {
  const candidate = LAST_COMBINATOR_TRACKER === tracker ? LAST_COMBINATOR : null;
  LAST_COMBINATOR = null;
  LAST_COMBINATOR_TRACKER = null;
  if (isCombinationOf(previous, tracker)) return previous;
  if (isCombinationOf(candidate, tracker)) return candidate;
  return combineTracker(tracker);
}

const OPEN_TRACK_FRAMES: (Tracker | null)[] = [];

export function beginTrackFrame(debuggingContext?: string | false): void {
  OPEN_TRACK_FRAMES.push(getTracker());
  setTracker(new Set());
  if (DEBUG) debug.beginTrackingTransaction!(debuggingContext);
}

export function endTrackFrame(): Tag {
  return endFrame(undefined);
}

// `endTrackFrame`, for a cache's frame with the cache's `previous` tag
// (`frameTag`).
function endFrame(previous: Tag | undefined): Tag {
  const current = getTracker();
  if (DEBUG) {
    if (OPEN_TRACK_FRAMES.length === 0) {
      throw new Error('attempted to close a tracking frame, but one was not open');
    }
    debug.endTrackingTransaction!();
  }
  setTracker(OPEN_TRACK_FRAMES.pop() ?? null);
  return current === null ? CONSTANT_TAG : frameTag(current, previous);
}

export function beginUntrackFrame(): void {
  OPEN_TRACK_FRAMES.push(getTracker());
  setTracker(null);
}

export function endUntrackFrame(): void {
  if (DEBUG && OPEN_TRACK_FRAMES.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }
  setTracker(OPEN_TRACK_FRAMES.pop() ?? null);
}

// This function is only for handling errors and resetting to a valid state
export function resetTracking(): string | void {
  OPEN_TRACK_FRAMES.length = 0;
  LAST_COMBINATOR = null;
  LAST_COMBINATOR_TRACKER = null;
  setTracker(null);
  if (DEBUG) return debug.resetTrackingTransaction!();
}

export function isTracking(): boolean {
  return getTracker() !== null;
}

export function consumeTag(tag: Tag): void {
  const tracker = getTracker();
  if (tracker !== null) {
    if (DEBUG) debug.markTagAsConsumed!(tag);
    addLeaves(tracker, tag);
    if (OPEN_TRACK_FRAMES.length > 0 && tag instanceof Combinator) {
      LAST_COMBINATOR = tag;
      LAST_COMBINATOR_TRACKER = tracker;
    }
  }
}

export function track(block: () => void, debugLabel?: string | false): Tag {
  beginTrackFrame(debugLabel);
  let tag: Tag;
  try {
    block();
  } finally {
    tag = endTrackFrame();
  }
  return tag;
}

export function untrack<T>(callback: () => T): T {
  beginUntrackFrame();
  try {
    return callback();
  } finally {
    endUntrackFrame();
  }
}

// ---------------------------------------------------------------- cache
// Glimmer's lazy, transitive cache (lib/tracking.ts) over the tags above.

const CACHE_KEY: unique symbol = Symbol('CACHE_KEY');
const FN: unique symbol = Symbol('FN');
const LAST_VALUE: unique symbol = Symbol('LAST_VALUE');
const TAG: unique symbol = Symbol('TAG');
const SNAPSHOT: unique symbol = Symbol('SNAPSHOT');
const DEBUG_LABEL: unique symbol = Symbol('DEBUG_LABEL');

export interface Cache<T = unknown> {
  [CACHE_KEY]: T;
}

interface InternalCache<T = unknown> {
  [FN]: () => T;
  [LAST_VALUE]: T | undefined;
  [TAG]: Tag | undefined;
  [SNAPSHOT]: Revision;
  [DEBUG_LABEL]?: string | false | undefined;
}

export function createCache<T>(fn: () => T, debuggingLabel?: string | false): Cache<T> {
  if (DEBUG && typeof fn !== 'function') {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }
  const cache: InternalCache<T> = {
    [FN]: fn,
    [LAST_VALUE]: undefined,
    [TAG]: undefined,
    [SNAPSHOT]: -1,
  };
  if (DEBUG) cache[DEBUG_LABEL] = debuggingLabel;
  return cache as unknown as Cache<T>;
}

export function getValue<T>(cache: Cache<T>): T | undefined {
  assertCache(cache, 'getValue');
  const fn = cache[FN];
  let tag = cache[TAG];
  const snapshot = cache[SNAPSHOT];
  if (tag === undefined || !validateTag(tag, snapshot)) {
    beginTrackFrame();
    try {
      cache[LAST_VALUE] = fn();
    } finally {
      tag = endFrame(tag);
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
  const tag = cache[TAG];
  if (DEBUG && tag === undefined) {
    throw new Error(
      `isConst() can only be used on a cache once getValue() has been called at least once. Called with cache function:\n\n${String(
        cache[FN]
      )}`
    );
  }
  return isConstTag(tag as Tag);
}

function assertCache<T>(
  value: Cache<T> | InternalCache<T>,
  fnName: string
): asserts value is InternalCache<T> {
  if (DEBUG && !(typeof value === 'object' && value !== null && FN in value)) {
    throw new Error(
      `${fnName}() can only be used on an instance of a cache created with createCache(). Called with: ${String(
        value
      )}`
    );
  }
}

// ---------------------------------------------------------------- meta

export type TagMeta = Map<PropertyKey, UpdatableTag>;

export function tagMetaFor(obj: object): TagMeta {
  return gxtTagMetaFor(obj);
}

export function tagFor(obj: object, key: PropertyKey, meta?: TagMeta): UpdatableTag {
  return gxtTagFor(obj, key, meta);
}

export function dirtyTagFor(obj: object, key: PropertyKey, meta?: TagMeta): void {
  if (DEBUG && !((typeof obj === 'object' && obj !== null) || typeof obj === 'function')) {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
  const tag = meta === undefined ? peekTagFor(obj, key) : meta.get(key);
  if (tag === undefined) return;
  if (DEBUG) debug.assertTagNotConsumed!(tag, obj, key as string | symbol);
  dirtyCell(tag);
}

// ---------------------------------------------------------------- tracked-data
// `@tracked` storage: the value lives IN the per-(obj, key) tag cell. `UNSET`
// = never initialized (classic Glimmer used a separate WeakMap per field).

export function trackedData<T extends object, K extends keyof T>(
  key: K,
  initializer?: (this: T) => T[K]
): { getter: (self: T) => T[K] | undefined; setter: (self: T, value: T[K]) => void } {
  const hasInitializer = typeof initializer === 'function';
  return {
    getter(self: T): T[K] | undefined {
      const tag = gxtTagFor(self, key);
      let value = tag._value as T[K] | undefined | typeof UNSET;
      if (value === UNSET) {
        value = hasInitializer ? (initializer as (this: T) => T[K]).call(self) : undefined;
        tag._value = value;
      }
      consumeTag(tag);
      return value;
    },
    setter(self: T, value: T[K]): void {
      const tag = gxtTagFor(self, key);
      if (DEBUG) debug.assertTagNotConsumed!(tag, self, key);
      tag._value = value;
      dirtyCell(tag);
    },
  };
}

// ---------------------------------------------------------------- debug
// DEV-only render/compute-transaction bookkeeping for the backtracking
// assertion ("You attempted to update X, but it had already been used
// previously in the same computation"), ported from Glimmer's lib/debug.ts.
// It never affects revisions. Messages use Ember's getDebugName, as the
// classic environment.ts `setTrackingTransactionEnv` override does.

interface Transaction {
  parent: Transaction | null;
  debugLabel?: string | undefined;
}

interface DebugTransaction {
  beginTrackingTransaction?: (debuggingContext?: string | false) => void;
  endTrackingTransaction?: () => void;
  runInTrackingTransaction?: <T>(fn: () => T, debuggingContext?: string | false) => T;
  resetTrackingTransaction?: () => string;
  setTrackingTransactionEnv?: (env: {
    debugMessage?(obj?: unknown, keyName?: string): string;
  }) => void;
  assertTagNotConsumed?: <T>(tag: Tag, obj?: T, keyName?: keyof T | string | symbol) => void;
  markTagAsConsumed?: (tag: Tag) => void;
  logTrackingStack?: (transaction?: Transaction) => string;
}

export const debug: DebugTransaction = {};

if (DEBUG) {
  let CONSUMED_TAGS: WeakMap<Tag, Transaction> | null = null;
  const TRANSACTION_STACK: Transaction[] = [];

  const TRANSACTION_ENV = {
    debugMessage(obj?: unknown, keyName?: string): string {
      const name = getDebugName!(obj);
      const dirtyString = keyName ? `\`${keyName}\` on \`${name}\`` : `\`${name}\``;
      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  };

  debug.setTrackingTransactionEnv = (env) => Object.assign(TRANSACTION_ENV, env);

  debug.beginTrackingTransaction = (debugLabel?: string | false) => {
    CONSUMED_TAGS = CONSUMED_TAGS || new WeakMap();
    TRANSACTION_STACK.push({
      parent: TRANSACTION_STACK[TRANSACTION_STACK.length - 1] ?? null,
      debugLabel: debugLabel || undefined,
    });
  };

  debug.endTrackingTransaction = () => {
    if (TRANSACTION_STACK.length === 0) {
      throw new Error('attempted to close a tracking transaction, but one was not open');
    }
    TRANSACTION_STACK.pop();
    if (TRANSACTION_STACK.length === 0) CONSUMED_TAGS = null;
  };

  debug.resetTrackingTransaction = () => {
    let stack = '';
    if (TRANSACTION_STACK.length > 0) {
      stack = debug.logTrackingStack!(TRANSACTION_STACK[TRANSACTION_STACK.length - 1]);
    }
    TRANSACTION_STACK.length = 0;
    CONSUMED_TAGS = null;
    return stack;
  };

  debug.runInTrackingTransaction = <T>(fn: () => T, debugLabel?: string | false): T => {
    debug.beginTrackingTransaction!(debugLabel);
    let didError = true;
    try {
      const value = fn();
      didError = false;
      return value;
    } finally {
      if (!didError) debug.endTrackingTransaction!();
    }
  };

  debug.logTrackingStack = (transaction?: Transaction) => {
    const labels: string[] = [];
    let current: Transaction | null | undefined =
      transaction || TRANSACTION_STACK[TRANSACTION_STACK.length - 1];
    while (current) {
      if (current.debugLabel) labels.unshift(current.debugLabel);
      current = current.parent;
    }
    return labels.map((label, index) => ' '.repeat(2 * index) + label).join('\n');
  };

  const markConsumed = (tag: Tag, transaction: Transaction): void => {
    if (CONSUMED_TAGS!.has(tag)) return;
    CONSUMED_TAGS!.set(tag, transaction);
    if (tag instanceof Combinator) {
      for (const member of tag.tags) markConsumed(member, transaction);
    } else if (!(tag instanceof NativeTag)) {
      const sub = SUBTAGS.get(tag);
      if (sub !== undefined && sub.subtag !== null) markConsumed(sub.subtag, transaction);
    }
  };

  debug.markTagAsConsumed = (tag: Tag) => {
    if (!CONSUMED_TAGS || TRANSACTION_STACK.length === 0) return;
    markConsumed(tag, TRANSACTION_STACK[TRANSACTION_STACK.length - 1] as Transaction);
  };

  const nthIndex = (str: string, pattern: string, n: number, startingPos = -1) => {
    let i = startingPos;
    while (n-- > 0 && i++ < str.length) {
      i = str.indexOf(pattern, i);
      if (i < 0) break;
    }
    return i;
  };

  debug.assertTagNotConsumed = <T>(tag: Tag, obj?: T, keyName?: keyof T | string | symbol) => {
    if (CONSUMED_TAGS === null) return;
    const transaction = CONSUMED_TAGS.get(tag);
    if (!transaction) return;
    const message = [
      TRANSACTION_ENV.debugMessage(obj, keyName && String(keyName)),
      `\`${String(keyName)}\` was first used:`,
      debug.logTrackingStack!(transaction),
      `Stack trace for the update:`,
    ].join('\n\n');
    // Same stack trimming as Glimmer: point the trace at the update site.
    try {
      assert(message, false);
    } catch (e) {
      if (e instanceof Error && typeof e.stack === 'string') {
        const updateStackBegin = e.stack.indexOf('Stack trace for the update:');
        if (updateStackBegin !== -1) {
          const start = nthIndex(e.stack, '\n', 1, updateStackBegin);
          const end = nthIndex(e.stack, '\n', 4, updateStackBegin);
          e.stack = e.stack.substr(0, start) + e.stack.substr(end);
        }
      }
      throw e;
    }
  };
}

export function unwrap<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val;
}
