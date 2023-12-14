import { DEBUG } from '@glimmer/env';
import { assert, scheduleRevalidate } from '@glimmer/global-context';
import { setDescription, devmode, inDevmode, stringifyDebugLabel, getLast, asPresentArray, expect, toValidatableDescription, getDescription, createWithDescription, mapDevmode } from '@glimmer/util';

function indexable(input) {
  return input;
}
function getGlobal() {
  if (typeof globalThis !== 'undefined') return indexable(globalThis);
  if (typeof self !== 'undefined') return indexable(self);
  if (typeof window !== 'undefined') return indexable(window);
  if (typeof global !== 'undefined') return indexable(global);
  throw new Error('unable to locate global object');
}
function unwrap(val) {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val;
}

const debug = {};
if (DEBUG) {
  let CONSUMED_TAGS = null;
  const TRANSACTION_STACK = [];

  /////////

  const TRANSACTION_ENV = {
    debugMessage(obj, keyName) {
      let objName;
      if (typeof obj === 'function') {
        objName = obj.name;
      } else if (typeof obj === 'object' && obj !== null) {
        let className = obj.constructor && obj.constructor.name || '(unknown class)';
        objName = `(an instance of ${className})`;
      } else if (obj === undefined) {
        objName = '(an unknown tag)';
      } else {
        objName = String(obj);
      }
      let dirtyString = keyName ? `\`${keyName}\` on \`${objName}\`` : `\`${objName}\``;
      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    }
  };
  debug.setTrackingTransactionEnv = env => Object.assign(TRANSACTION_ENV, env);
  debug.beginTrackingTransaction = description => {
    CONSUMED_TAGS = CONSUMED_TAGS || new WeakMap();
    let parent = TRANSACTION_STACK[TRANSACTION_STACK.length - 1] ?? null;
    TRANSACTION_STACK.push({
      parent,
      description: devmode(() => description)
    });
  };
  debug.endTrackingTransaction = () => {
    if (TRANSACTION_STACK.length === 0) {
      throw new Error('attempted to close a tracking transaction, but one was not open');
    }
    TRANSACTION_STACK.pop();
    if (TRANSACTION_STACK.length === 0) {
      CONSUMED_TAGS = null;
    }
  };
  debug.resetTrackingTransaction = () => {
    let stack = '';
    if (TRANSACTION_STACK.length > 0) {
      stack = debug.logTrackingStack(TRANSACTION_STACK[TRANSACTION_STACK.length - 1]);
    }
    TRANSACTION_STACK.splice(0, TRANSACTION_STACK.length);
    CONSUMED_TAGS = null;
    return stack;
  };

  /**
   * Creates a global autotracking transaction. This will prevent any backflow
   * in any `track` calls within the transaction, even if they are not
   * externally consumed.
   *
   * `runInAutotrackingTransaction` can be called within itself, and it will add
   * onto the existing transaction if one exists.
   *
   * TODO: Only throw an error if the `track` is consumed.
   */
  debug.runInTrackingTransaction = (fn, description = {
    reason: 'tracking',
    label: ['(tracking)']
  }) => {
    debug.beginTrackingTransaction(description);
    let didError = true;
    try {
      let value = fn();
      didError = false;
      return value;
    } finally {
      if (didError !== true) {
        debug.endTrackingTransaction();
      }

      // if (id !== TRANSACTION_STACK.length) {
      //   throw new Error(
      //     `attempted to close a tracking transaction (${id}), but it was not the last transaction (${TRANSACTION_STACK.length})`
      //   );
      // }
    }
  };
  let nthIndex = (str, pattern, n, startingPos = -1) => {
    let i = startingPos;
    while (n-- > 0 && i++ < str.length) {
      i = str.indexOf(pattern, i);
      if (i < 0) break;
    }
    return i;
  };
  let makeTrackingErrorMessage = (transaction, obj, keyName) => {
    let message = [TRANSACTION_ENV.debugMessage(obj, keyName && String(keyName))];
    message.push(`\`${String(keyName)}\` was first used:`);
    message.push(debug.logTrackingStack(transaction));
    message.push(`Stack trace for the update:`);
    return message.join('\n\n');
  };
  debug.logTrackingStack = transaction => {
    let trackingStack = [];
    let current = transaction || TRANSACTION_STACK[TRANSACTION_STACK.length - 1];
    if (current === undefined) return '';
    while (current) {
      trackingStack.unshift(current);
      current = current.parent;
    }
    return trackingStack.map((label, index) => ' '.repeat(2 * index) + inDevmode(stringifyDebugLabel(label))).join('\n');
  };
  debug.markTagAsConsumed = _tag => {
    if (!CONSUMED_TAGS || CONSUMED_TAGS.has(_tag)) return;
    CONSUMED_TAGS.set(_tag, getLast(asPresentArray(TRANSACTION_STACK)));

    // We need to mark the tag and all of its subtags as consumed, so we need to
    // cast it and access its internals. In the future this shouldn't be necessary,
    // this is only for computed properties.
    let subtag = _tag.subtag;
    if (!subtag || !debug.markTagAsConsumed) return;
    if (Array.isArray(subtag)) {
      subtag.forEach(debug.markTagAsConsumed);
    } else {
      debug.markTagAsConsumed(subtag);
    }
  };
  debug.assertTagNotConsumed = (tag, obj, keyName) => {
    if (CONSUMED_TAGS === null) return;
    let transaction = CONSUMED_TAGS.get(tag);
    if (!transaction) return;

    // This hack makes the assertion message nicer, we can cut off the first
    // few lines of the stack trace and let users know where the actual error
    // occurred.
    try {
      assert(false, makeTrackingErrorMessage(transaction, obj, keyName));
    } catch (e) {
      if (hasStack(e)) {
        let updateStackBegin = e.stack.indexOf('Stack trace for the update:');
        if (updateStackBegin !== -1) {
          let start = nthIndex(e.stack, '\n', 1, updateStackBegin);
          let end = nthIndex(e.stack, '\n', 4, updateStackBegin);
          // eslint-disable-next-line deprecation/deprecation
          e.stack = e.stack.substr(0, start) + e.stack.substr(end);
        }
      }
      throw e;
    }
  };
}
function hasStack(error) {
  return typeof error === 'object' && error !== null && 'stack' in error && typeof error.stack === 'string';
}

//////////

/**
 * The INVALID revision is guaranteed to be invalid, even if the tag is CONSTANT. This makes it
 * possible for a reference to become invalid temporarily and then become valid again.
 *
 * It's meant to be used in cached revisions, so there is no `INVALID_TAG`.
 */
const INVALID_REVISION = -1;
const CONSTANT = 0;
const INITIAL = 1;
const VOLATILE = NaN;
let $REVISION = INITIAL;
function bump() {
  $REVISION++;
}

//////////

/** @internal */
const DIRYTABLE_TAG_ID = 0;
/** @internal */
const UPDATABLE_TAG_ID = 1;
/** @internal */
const COMBINATOR_TAG_ID = 2;
/** @internal */
const CONSTANT_TAG_ID = 3;

//////////

const COMPUTE = Symbol('TAG_COMPUTE');

//////////

/**
 * `value` receives a tag and returns an opaque Revision based on that tag. This
 * snapshot can then later be passed to `validate` with the same tag to
 * determine if the tag has changed at all since the time that `value` was
 * called.
 *
 * @param tag
 */
function valueForTag(tag) {
  return tag[COMPUTE]();
}

/**
 * `validate` receives a tag and a snapshot from a previous call to `value` with
 * the same tag, and determines if the tag is still valid compared to the
 * snapshot. If the tag's state has changed at all since then, `validate` will
 * return false, otherwise it will return true. This is used to determine if a
 * calculation related to the tags should be rerun.
 *
 * @param tag
 * @param snapshot
 */
function validateTag(tag, snapshot) {
  return snapshot >= tag[COMPUTE]();
}

//////////

const TYPE = Symbol('TAG_TYPE');

// this is basically a const
let ALLOW_CYCLES;
if (DEBUG) {
  ALLOW_CYCLES = new WeakMap();
}
function allowsCycles(tag) {
  if (ALLOW_CYCLES === undefined) {
    return true;
  } else {
    return ALLOW_CYCLES.has(tag);
  }
}
class MonomorphicTagImpl {
  static combine(tags, description = devmode(() => ({
    kind: 'tag',
    label: ['(combine)']
  }))) {
    switch (tags.length) {
      case 0:
        return CONSTANT_TAG;
      case 1:
        if (!DEBUG) {
          return tags[0];
        }
      default:
        {
          let tag = createWithDescription(() => new MonomorphicTagImpl(COMBINATOR_TAG_ID), description);
          updateSubtags(tag, tags);
          return tag;
        }
    }
  }
  revision = INITIAL;
  lastChecked = INITIAL;
  lastValue = INITIAL;
  isUpdating = false;
  subtags = null;
  subtagBufferCache = null;
  [TYPE];
  constructor(type) {
    this[TYPE] = type;
  }
  [COMPUTE]() {
    let {
      lastChecked
    } = this;
    if (this.isUpdating === true) {
      if (DEBUG && !allowsCycles(this)) {
        throw new Error('Cycles in tags are not allowed');
      }
      this.lastChecked = ++$REVISION;
    } else if (lastChecked !== $REVISION) {
      this.isUpdating = true;
      this.lastChecked = $REVISION;
      try {
        let {
          subtags,
          revision
        } = this;
        if (subtags !== null) {
          if (Array.isArray(subtags)) {
            for (const tag of subtags) {
              let value = tag[COMPUTE]();
              revision = Math.max(value, revision);
            }
          } else {
            let subtagValue = subtags[COMPUTE]();
            if (subtagValue === this.subtagBufferCache) {
              revision = Math.max(revision, this.lastValue);
            } else {
              // Clear the temporary buffer cache
              this.subtagBufferCache = null;
              revision = Math.max(revision, subtagValue);
            }
          }
        }
        this.lastValue = revision;
      } finally {
        this.isUpdating = false;
      }
    }
    return this.lastValue;
  }
  static updateTag(_tag, _subtag) {
    if (DEBUG && _tag[TYPE] !== UPDATABLE_TAG_ID) {
      throw new Error('Attempted to update a tag that was not updatable');
    }

    // TODO: TS 3.7 should allow us to do this via assertion
    let tag = _tag;
    let subtag = _subtag;
    if (subtag === CONSTANT_TAG) {
      emptySubtag(tag);
    } else {
      // There are two different possibilities when updating a subtag:
      //
      // 1. subtag[COMPUTE]() <= tag[COMPUTE]();
      // 2. subtag[COMPUTE]() > tag[COMPUTE]();
      //
      // The first possibility is completely fine within our caching model, but
      // the second possibility presents a problem. If the parent tag has
      // already been read, then it's value is cached and will not update to
      // reflect the subtag's greater value. Next time the cache is busted, the
      // subtag's value _will_ be read, and it's value will be _greater_ than
      // the saved snapshot of the parent, causing the resulting calculation to
      // be rerun erroneously.
      //
      // In order to prevent this, when we first update to a new subtag we store
      // its computed value, and then check against that computed value on
      // subsequent updates. If its value hasn't changed, then we return the
      // parent's previous value. Once the subtag changes for the first time,
      // we clear the cache and everything is finally in sync with the parent.
      tag.subtagBufferCache = subtag[COMPUTE]();
      updateSubtag(tag, subtag);
    }
  }
  static dirtyTag(tag, disableConsumptionAssertion) {
    if (DEBUG && !(tag[TYPE] === UPDATABLE_TAG_ID || tag[TYPE] === DIRYTABLE_TAG_ID)) {
      throw new Error('Attempted to dirty a tag that was not dirtyable');
    }
    if (DEBUG && disableConsumptionAssertion !== true) {
      // Usually by this point, we've already asserted with better error information,
      // but this is our last line of defense.
      unwrap(debug.assertTagNotConsumed)(tag);
    }
    tag.revision = ++$REVISION;
    scheduleRevalidate();
  }
}
const DIRTY_TAG = MonomorphicTagImpl.dirtyTag;
const UPDATE_TAG = MonomorphicTagImpl.updateTag;

//////////

function createTag(label) {
  return createTagWithId(DIRYTABLE_TAG_ID, label ?? devmode(() => ({
    reason: 'cell',
    label: ['(dirtyable)']
  })));
}
function createUpdatableTag(label) {
  return createTagWithId(UPDATABLE_TAG_ID, label ?? devmode(() => ({
    reason: 'cell',
    label: ['(updatable)']
  })));
}
function updateSubtag(tag, subtag) {
  tag.subtags = subtag;
  setDescription(tag, devmode(() => mapDevmode(() => tag.description, desc => ({
    ...desc,
    subtags: [inDevmode(subtag.description)]
  }))));
}
function updateSubtags(tag, subtags) {
  tag.subtags = subtags;
  if (DEBUG) {
    applyComboLabel(tag, subtags);
  }
}
function emptySubtag(tag) {
  tag.subtags = null;
  if (DEBUG) {
    delete inDevmode(tag.description).subtags;
  }
}
function createTagWithId(id, label) {
  expect(label, `Expected a tag description`);
  if (DEBUG && label) {
    const tag = new MonomorphicTagImpl(id);
    setDescription(tag, label);
    return tag;
  } else {
    return new MonomorphicTagImpl(id);
  }
}

/**
 * @category devmode
 */
function applyComboLabel(parent, tags) {
  const debug = inDevmode(parent.description);
  if (Array.isArray(tags)) {
    parent.description = devmode(() => ({
      ...debug,
      subtags: tags.map(tag => inDevmode(tag.description))
    }));
  } else {
    parent.description = devmode(() => ({
      ...debug,
      subtags: [inDevmode(tags.description)]
    }));
  }
}

//////////

const CONSTANT_TAG = new MonomorphicTagImpl(CONSTANT_TAG_ID);
setDescription(CONSTANT_TAG, devmode(() => ({
  reason: 'cell',
  label: ['(constant)']
})));
function isConstTag(tag) {
  return tag === CONSTANT_TAG;
}

//////////

const VOLATILE_TAG_ID = 100;
class VolatileTag {
  subtag;
  [TYPE] = VOLATILE_TAG_ID;
  [COMPUTE]() {
    return VOLATILE;
  }
}
const VOLATILE_TAG = new VolatileTag();
setDescription(VOLATILE_TAG, devmode(() => ({
  reason: 'cell',
  label: ['(volatile)']
})));

//////////

const CURRENT_TAG_ID = 101;
class CurrentTag {
  subtag;
  [TYPE] = CURRENT_TAG_ID;
  [COMPUTE]() {
    return $REVISION;
  }
}
const CURRENT_TAG = new CurrentTag();
setDescription(CURRENT_TAG, devmode(() => ({
  reason: 'cell',
  label: ['(current)']
})));

//////////

const combine = MonomorphicTagImpl.combine;

//////////

/**
 * @internal
 */
const TAG_TYPE = TYPE;

function isObjectLike(u) {
  return typeof u === 'object' && u !== null || typeof u === 'function';
}

///////////

const TRACKED_TAGS = new WeakMap();
function dirtyTagFor(obj, key, meta) {
  if (DEBUG && !isObjectLike(obj)) {
    throw new Error(`BUG: Can't update a tag for a primitive`);
  }
  let tags = meta === undefined ? TRACKED_TAGS.get(obj) : meta;

  // No tags have been setup for this object yet, return
  if (tags === undefined) return;

  // Dirty the tag for the specific property if it exists
  let propertyTag = tags.get(key);
  if (propertyTag !== undefined) {
    if (DEBUG) {
      unwrap(debug.assertTagNotConsumed)(propertyTag, obj, key);
    }
    DIRTY_TAG(propertyTag, true);
  }
}
function tagMetaFor(obj) {
  let tags = TRACKED_TAGS.get(obj);
  if (tags === undefined) {
    tags = new Map();
    TRACKED_TAGS.set(obj, tags);
  }
  return tags;
}
function tagFor(obj, key, meta) {
  let tags = meta === undefined ? tagMetaFor(obj) : meta;
  let tag = tags.get(key);
  if (tag === undefined) {
    tag = createUpdatableTag(devmode(() => ({
      reason: 'property',
      label: ['(object)', key]
    })));
    tags.set(key, tag);
  }
  return tag;
}

/**
 * An object that that tracks @tracked properties that were consumed.
 */
class Tracker {
  tags = new Set();
  last = null;
  add(tag) {
    if (tag === CONSTANT_TAG) return;
    this.tags.add(tag);
    if (DEBUG) {
      unwrap(debug.markTagAsConsumed)(tag);
    }
    this.last = tag;
  }
  combine() {
    let {
      tags
    } = this;
    if (tags.size === 0) {
      return CONSTANT_TAG;
    } else if (!DEBUG && tags.size === 1) {
      return this.last;
    } else {
      return combine(Array.from(tags));
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
let CURRENT_TRACKER = null;
const OPEN_TRACK_FRAMES = [];
function beginTrackFrame(context = devmode(() => ({
  reason: 'formula',
  label: ['(tracking frame)']
}))) {
  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);
  CURRENT_TRACKER = new Tracker();
  setDescription(CURRENT_TRACKER, context);
  if (DEBUG) {
    unwrap(debug.beginTrackingTransaction)(inDevmode(context));
  }
}
function endTrackFrame() {
  let current = CURRENT_TRACKER;
  if (DEBUG) {
    if (OPEN_TRACK_FRAMES.length === 0) {
      throw new Error('attempted to close a tracking frame, but one was not open');
    }
    unwrap(debug.endTrackingTransaction)();
  }
  CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop() || null;
  return unwrap(current).combine();
}
function beginUntrackFrame() {
  OPEN_TRACK_FRAMES.push(CURRENT_TRACKER);
  CURRENT_TRACKER = null;
}
function endUntrackFrame() {
  if (DEBUG && OPEN_TRACK_FRAMES.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }
  CURRENT_TRACKER = OPEN_TRACK_FRAMES.pop() || null;
}

// This function is only for handling errors and resetting to a valid state
function resetTracking() {
  while (OPEN_TRACK_FRAMES.length > 0) {
    OPEN_TRACK_FRAMES.pop();
  }
  CURRENT_TRACKER = null;
  if (DEBUG) {
    return unwrap(debug.resetTrackingTransaction)();
  }
}
function isTracking() {
  return CURRENT_TRACKER !== null;
}
function consumeTag(tag) {
  if (CURRENT_TRACKER !== null) {
    CURRENT_TRACKER.add(tag);
  }
}

// public interface

const FN = Symbol('FN');
const LAST_VALUE = Symbol('LAST_VALUE');
const TAG = Symbol('TAG');
const SNAPSHOT = Symbol('SNAPSHOT');
const CACHE_DEFAULTS = devmode(() => ({
  reason: 'cache',
  label: ['(cache)']
}));
function createCache(fn, debuggingLabel) {
  if (DEBUG && !(typeof fn === 'function')) {
    throw new Error(`createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`);
  }
  let cache = {
    [FN]: fn,
    [LAST_VALUE]: undefined,
    [TAG]: undefined,
    [SNAPSHOT]: -1
  };
  setDescription(cache, devmode(() => toValidatableDescription(debuggingLabel, CACHE_DEFAULTS)));
  return cache;
}
function getValue(cache) {
  assertCache(cache, 'getValue');
  let fn = cache[FN];
  let tag = cache[TAG];
  let snapshot = cache[SNAPSHOT];
  if (tag === undefined || !validateTag(tag, snapshot)) {
    beginTrackFrame(getDescription(cache));
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
function isConst(cache) {
  assertCache(cache, 'isConst');
  let tag = cache[TAG];
  assertTag(tag, cache);
  return isConstTag(tag);
}
function assertCache(value, fnName) {
  if (DEBUG && !(typeof value === 'object' && value !== null && FN in value)) {
    throw new Error(`${fnName}() can only be used on an instance of a cache created with createCache(). Called with: ${String(value)}`);
  }
}

// replace this with `expect` when we can
function assertTag(tag, cache) {
  if (DEBUG && tag === undefined) {
    throw new Error(`isConst() can only be used on a cache once getValue() has been called at least once. Called with cache function:\n\n${String(cache[FN])}`);
  }
}

//////////

// Legacy tracking APIs

// track() shouldn't be necessary at all in the VM once the autotracking
// refactors are merged, and we should generally be moving away from it. It may
// be necessary in Ember for a while longer, but I think we'll be able to drop
// it in favor of cache sooner rather than later.
function track(block, description = devmode(() => ({
  reason: 'tracking',
  label: ['(track)']
}))) {
  beginTrackFrame(description);
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
function untrack(callback) {
  beginUntrackFrame();
  try {
    return callback();
  } finally {
    endUntrackFrame();
  }
}

function trackedData(key, initializer) {
  let values = new WeakMap();
  let hasInitializer = typeof initializer === 'function';
  function getter(self) {
    consumeTag(tagFor(self, key));
    let value;

    // If the field has never been initialized, we should initialize it
    if (hasInitializer && !values.has(self)) {
      value = initializer.call(self);
      values.set(self, value);
    } else {
      value = values.get(self);
    }
    return value;
  }
  function setter(self, value) {
    dirtyTagFor(self, key);
    values.set(self, value);
  }
  return {
    getter,
    setter
  };
}

const GLIMMER_VALIDATOR_REGISTRATION = Symbol('GLIMMER_VALIDATOR_REGISTRATION');
const globalObj = getGlobal();
if (globalObj[GLIMMER_VALIDATOR_REGISTRATION] === true) {
  throw new Error('The `@glimmer/validator` library has been included twice in this application. It could be different versions of the package, or the same version included twice by mistake. `@glimmer/validator` depends on having a single copy of the package in use at any time in an application, even if they are the same version. You must dedupe your build to remove the duplicate packages in order to prevent this error.');
}
globalObj[GLIMMER_VALIDATOR_REGISTRATION] = true;

export { ALLOW_CYCLES, COMBINATOR_TAG_ID, COMPUTE, CONSTANT, CONSTANT_TAG, CONSTANT_TAG_ID, CURRENT_TAG, CurrentTag, DIRYTABLE_TAG_ID, INITIAL, INVALID_REVISION, TAG_TYPE, UPDATABLE_TAG_ID, VOLATILE, VOLATILE_TAG, VolatileTag, beginTrackFrame, beginUntrackFrame, bump, combine, consumeTag, createCache, createTag, createUpdatableTag, debug, DIRTY_TAG as dirtyTag, dirtyTagFor, endTrackFrame, endUntrackFrame, getValue, isConst, isConstTag, isTracking, resetTracking, tagFor, tagMetaFor, track, trackedData, untrack, UPDATE_TAG as updateTag, validateTag, valueForTag };
