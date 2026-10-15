// Import from glimmer-compatibility to avoid gxt compiler conflicts
import { DEBUG } from '@glimmer/env';
import { validator, caching, storage } from '@lifeart/gxt/glimmer-compatibility';
// Global context module — imported as a namespace so the live
// `scheduleRevalidate` binding (which testOverrideGlobalContext reassigns
// at runtime) is picked up.
import * as _glimmerGlobalContext from '@glimmer/global-context';
// Direct import of GXT's native cell primitive (NOT via storage wrapper) so
// classic @glimmer/validator tag mutations can be bridged into GXT's effect system.
// Using the same cell factory that _gxtEffect tracks ensures reads inside an
// effect register a subscription that will re-fire the effect on updates.
import {
  cell as _gxtNativeCell,
  dirtyCell as _gxtDirtyCell,
  peekTagFor as _gxtPeekTagFor,
  syncDom as _gxtSyncDom,
  // The tracking frame gxt records the cells a computation reads in
  // (`createCache` below).
  getTracker as _gxtGetTracker,
  setTracker as _gxtSetTracker,
} from '@lifeart/gxt';
// Routes the track() reentrancy-guard save-restore through the typed bridge
// helper. See `withTriggerSuppressed` doc in gxt-bridge.ts.
import { getGxtRenderer, getEmberAssertDirect } from './gxt-bridge';

// Create cell-like functionality using storage primitives
const createCell = (initialValue: any, name?: string) => {
  const s = storage.createStorage(initialValue, Object.is);
  return {
    get value() {
      return storage.getValue(s);
    },
    set value(v: any) {
      storage.setValue(s, v);
    },
  };
};
const cell = createCell;

// Create formula using cache
const formula = <T>(fn: () => T, name?: string) => {
  const cache = caching.createCache(fn);
  return {
    get value() {
      return caching.getValue(cache);
    },
  };
};

export const { tagMetaFor } = validator;

// The gxt validator primitives the shim builds on.
const {
  tagFor: gxtTagFor,
  isTracking: gxtIsTracking,
  // trackedData - a custom implementation is provided below to avoid infinite loops
  untrack: gxtUntrack,
  beginTrackFrame: gxtBeginTrackFrame,
  endTrackFrame: gxtEndTrackFrame,
  beginUntrackFrame: gxtBeginUntrackFrame,
  endUntrackFrame: gxtEndUntrackFrame,
} = validator;

// ---- Custom track() implementation ----
// GXT's native track() only sets a rendering flag and doesn't return a tag
// representing consumed dependencies. Ember's autoComputed relies on track()
// returning a combined tag so that updateTag/validateTag can detect when
// dependencies change.
//
// Strategy: run the callback and capture which GXT cells were read by
// temporarily hooking into GXT's cell tracking system. Return a tag
// that knows about these cells and can detect when they change by
// re-running the callback and comparing results.
let _trackingTagStack: Set<any>[] | null = null;

export function track(cb: () => void): any {
  // Entering an explicit tracking frame: temporarily clear the local
  // untrack depth so that inner consumeTag calls register and nested
  // isTracking() reports truthy even when logically inside an
  // outer untrack(). The depth is restored on exit.
  const savedUntrackDepth = _localUntrackDepth;
  _localUntrackDepth = 0;
  // Push a new set to collect consumed tags (from explicit consumeTag calls)
  if (!_trackingTagStack) _trackingTagStack = [];
  const consumed = new Set<any>();
  _trackingTagStack.push(consumed);

  // Install a debug tracking transaction so that trackedData.setter can
  // detect a read-then-write within the same track() frame. This surfaces
  // the "You attempted to update `value` on `MyObject`…" assertion that
  // classic @glimmer/validator raises in DEV builds.
  //
  // If an outer runInTrackingTransaction frame is already active, reuse it
  // so that consumed tags propagate outward (required by tests that consume
  // in one track() and dirty in a sibling track() within the same debug
  // transaction).
  const hadOuterTransaction = _debugTransactionConsumed !== null;
  const prevConsumed = _debugTransactionConsumed;
  const prevLabels = _debugTransactionLabelForTag;
  if (!hadOuterTransaction) {
    _debugTransactionConsumed = new Set<any>();
    _debugTransactionLabelForTag = new WeakMap<any, string>();
  }

  // Suppress re-render triggering (compile.ts `_gxtTriggerReRender`) during
  // track() to prevent infinite recursion when a getter calls
  // notifyPropertyChange (trigger → re-read getter → notifyPropertyChange → …).
  // See `withTriggerSuppressed` in gxt-bridge.ts.

  // Run the callback. The tracked getters read GXT cells, establishing
  // dependencies. Those cells can't be captured directly, but changes can be
  // detected by re-running the callback later and checking if any tracked
  // values changed.
  //
  // Store the callback itself, plus a snapshot of tracked values via a
  // version counter. Each time a tracked cell is dirtied (via dirtyTagFor),
  // bump a global revision. Compare the revision at snapshot time vs current
  // to detect changes.
  const _runTrack = () => {
    gxtBeginTrackFrame();
    try {
      cb();
    } finally {
      gxtEndTrackFrame();
      _trackingTagStack!.pop();
      if (_trackingTagStack!.length === 0) _trackingTagStack = null;
      _localUntrackDepth = savedUntrackDepth;
      if (!hadOuterTransaction) {
        _debugTransactionConsumed = prevConsumed;
        _debugTransactionLabelForTag = prevLabels;
      }
    }
  };

  // Avoid `?? _runTrack()` because `_runTrack` returns `undefined` and would
  // cause a second invocation; instead branch on whether the bridge method is
  // installed (it is not, before compile.ts has loaded).
  const _withSuppressed = getGxtRenderer()?.compilePipeline.withTriggerSuppressed;
  if (_withSuppressed) {
    _withSuppressed(_runTrack);
  } else {
    _runTrack();
  }

  // If no specific tags were consumed, the frame's `cb()` did not depend
  // on any tracked state — by definition a constant. Return CONSTANT_TAG so
  // CheckTag / validateTag treat it as never-invalidating. This matches
  // classic @glimmer/validator semantics and is essential for e.g.
  // `updateTag(modifierTag, track(install))` in environment.ts: when a
  // modifier's install hook reads only constant args (`{{foo "foo" bar="baz"}}`),
  // the outer modifier tag must not invalidate on every unrelated mutation.
  const consumedArr = Array.from(consumed);
  if (consumed.size === 0) {
    return CONSTANT_TAG;
  }

  // Otherwise, return a combined tag scoped to the specific consumed
  // tags. This ensures that dirties of unrelated (especially untracked)
  // tags don't invalidate a frame that didn't actually read them.
  const tag: any = { _isCombinedTag: true, _consumed: consumedArr };
  Object.defineProperty(tag, 'value', {
    get() {
      return currentTagRevision(tag);
    },
  });
  combinedTagConstituents.set(tag, consumedArr);
  return tag;
}

// The tags `argumentTag` returned.
const _argumentTags = new WeakSet<object>();

/**
 * The tag of a component argument: the tag of what `read`, a read of the
 * argument, consumes (Glimmer's args proxy tags an argument so,
 * `tagForNamedArg`). A computed property whose dependent key goes through the
 * argument (`@computed('args.hash.firstName')`) depends on it. gxt re-runs a
 * formula only when a cell it read changes, and a formula's read of a cached
 * property does not read the property's dependencies again: so a reader of a
 * tag that depends on an argument's tag also consumes what the argument's
 * tag combines (`consumeTag`), and re-runs when the argument would change.
 */
export function argumentTag(read: () => void): any {
  const tag = track(read);
  if (tag !== null && typeof tag === 'object') _argumentTags.add(tag);
  return tag;
}

// Custom isTracking that also returns true when inside the custom track()
export function isTracking(): boolean {
  if (_localUntrackDepth > 0) return false;
  if (_trackingTagStack && _trackingTagStack.length > 0) return true;
  if (_manualTrackFrameStack.length > 0) return true;
  if (_cacheTagTracker.length > 0) return true;
  return gxtIsTracking();
}

// Manual track frames (beginTrackFrame/endTrackFrame) maintain their own
// stack so consumeTag() knows to register into them, and so endTrackFrame()
// can produce a combined tag. This is separate from GXT's own frame stack
// so frame boundaries are observable without depending on gxt internals.
const _manualTrackFrameStack: Set<any>[] = [];

// Wrap tagFor to handle Symbol keys properly
// GXT's tagFor might try to convert the key to a string for debugging
export function tagFor(obj: object, key?: string | symbol, meta?: any) {
  try {
    // Convert symbol keys to their description or a string representation
    const safeKey = typeof key === 'symbol' ? key.description || String(key) : key;
    // Ensure obj has a constructor property to prevent "Cannot read properties
    // of undefined (reading 'name')" in GXT's cellFor debug label generation.
    if (obj && typeof obj === 'object' && !obj.constructor) {
      Object.defineProperty(obj, 'constructor', {
        value: Object,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    // A property's tag, once it exists, is returned as is. A build-time
    // template's read of the property creates it without a value
    // (`$__tag(obj, key)`, Glimmer's getProp), and glimmer-compat's `tagFor`
    // would fill that value by reading the property: a getter that asks for
    // its own tag (a computed property) would re-enter it without end.
    const existing = _gxtPeekTagFor(obj, safeKey as string);
    if (existing !== undefined) return existing;
    return gxtTagFor(obj, safeKey, meta);
  } catch (err: any) {
    if (
      err?.message?.includes('Symbol') ||
      err?.message?.includes('name') ||
      err?.message?.includes('undefined')
    ) {
      // Return a minimal tag to avoid breaking the system
      return { value: 0 };
    }
    throw err;
  }
}
// Provide a LAZY createCache with proper invalidation for invokeHelper.
//
// GXT's native caching.createCache eagerly evaluates and only tracks direct
// cell reads. Ember's invokeHelper requires lazy construction and proper
// transitive dependency tracking through nested caches.
//
// Strategy: Each cache has its own "revision" that bumps when its value
// actually changes. Caches track other caches they read during evaluation
// (via _cacheEvalStack). A cache invalidates when:
// 1. Any consumed tag (via consumeTag) has changed value
// 2. Any nested cache read during fn() has a newer revision
// 3. The global revision counter has changed (for GXT cell reads that can't
//    be intercepted) AND fn() produces a different result (deep equality
//    check not feasible, so a per-cache revision system is used instead)
//
// 4. A gxt cell fn() read has a newer revision. Glimmer's createCache tracks
//    everything fn() reads; here a read can also be of a gxt cell that is no
//    Ember tag (a component argument, `this.args.x`, is one), so fn() runs in
//    its own gxt tracking frame and the cache keeps the cells it read with
//    their revisions. Every read of the cache adds those cells to the frame
//    reading it, as a nested read would have. What fn() reads in `untrack`
//    is not in the frame (see `untrack`).
//
// For correctness with the "constant helper" test: if a cache's fn() doesn't
// consume any tags or nested caches and reads no cell, it's treated as
// constant and never re-evaluated.

const _cacheEvalStack: Set<any>[] = [];

// The frame each createCache frame (`_evaluate`) runs inside of: the frame
// that read the cache.
const _cacheFrameReaders = new WeakMap<object, Set<any> | null>();

// The first frame that is not a createCache frame, from `frame` outward.
function _outsideCacheFrames(frame: Set<any> | null): Set<any> | null {
  let outside = frame;
  while (outside !== null && _cacheFrameReaders.has(outside)) {
    outside = _cacheFrameReaders.get(outside)!;
  }
  return outside;
}

export function createCache<T>(fn: () => T): { value: T; destroy?: () => void; tag?: any } {
  if (typeof fn !== 'function') {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }
  let _initialized = false;
  let _lastValue: T;
  // This cache's own revision (bumped when its value actually changes)
  let _revision = 0;
  // Tags consumed via consumeTag during fn()
  let _consumedTags: any[] = [];
  let _consumedTagSnapshots: any[] = [];
  // Nested caches read during fn() and their revisions at that time
  let _nestedCaches: any[] = [];
  let _nestedCacheRevisions: number[] = [];
  // gxt cells read during fn() and their revisions at that time
  let _cells: any[] = [];
  let _cellRevisions: unknown[] = [];
  // If the most recent _evaluate() call threw, store the error so that
  // subsequent .value reads observed by validation as "still valid" can
  // re-throw the same error rather than serving the previous successful
  // _lastValue (which would be a stale, pre-throw value). This mirrors
  // stock @glimmer/reference semantics where a Reference whose compute
  // throws does not cache lastValue/lastRevision, so the next valueForRef
  // recomputes (and re-throws). Cleared on the next successful _evaluate.
  // The debug render tree relies on this: reifyArgsDebug must observe a getter
  // that starts throwing in order to wrap the arg with ArgumentErrorImpl.
  let _lastError: unknown = null;
  let _hasLastError = false;

  const cacheObj: any = {
    _isCacheObj: true,
    _revision: 0,
    _initializedAtLeastOnce: false,
    _isCacheConst: false,

    get value(): T {
      if (!_isValid()) {
        const wasInitialized = _initialized;
        const oldValue = _lastValue;
        try {
          _lastValue = _evaluate();
          // Successful eval clears any cached error from a prior throw.
          _lastError = null;
          _hasLastError = false;
          _initialized = true;
        } catch (err) {
          // Cache the error so that subsequent .value reads (where
          // validation thinks nothing changed) re-throw rather than
          // returning a stale pre-throw _lastValue.
          _lastError = err;
          _hasLastError = true;
          throw err;
        }
        cacheObj._initializedAtLeastOnce = true;
        // A cache is const if its fn() consumed no tags and depended on
        // no nested caches during evaluation.
        cacheObj._isCacheConst =
          _consumedTags.length === 0 && _nestedCaches.length === 0 && _cells.length === 0;
        // Bump our revision if the value changed (or first eval)
        if (!wasInitialized || oldValue !== _lastValue) {
          _revision++;
          cacheObj._revision = _revision;
        }
      } else if (_hasLastError) {
        // Cache validation says it is still in sync with the same consumed
        // tags as during the throwing eval — the underlying state hasn't
        // changed, so the same throw must be observable. Re-throw.
        throw _lastError;
      }
      // Register in parent cache's eval stack so it sees this cache as a dependency
      if (_cacheEvalStack.length > 0) {
        _cacheEvalStack[_cacheEvalStack.length - 1]!.add(cacheObj);
      }
      // The reading frame depends on the cells fn() read.
      const readingFrame = _gxtGetTracker();
      if (readingFrame !== null) {
        for (let i = 0; i < _cells.length; i++) readingFrame.add(_cells[i]);
      }
      // Forward consumed tags to an enclosing gxt track frame / createCache
      // frame, so that cached reads still expose the underlying dependencies
      // to whichever tracker is currently active. Without this, a template
      // formula that reads the cache during initial evaluation would never
      // re-run when the underlying tracked state changes, because our cache
      // short-circuits with _lastValue and never re-enters consumeTag.
      if (_initialized && _consumedTags.length > 0) {
        const gxtTracking = gxtIsTracking();
        const cacheTrackingActive = _cacheTagTracker.length > 0;
        // Also forward into the shim's own classic frames (track() /
        // beginTrackFrame). gxtIsTracking() is not a proxy for those: in the
        // production gxt dist the tracking introspection is stubbed out and
        // gxtIsTracking() reports false even while a classic track() frame is
        // open. Without this, a cache read inside e.g. the env-commit's
        // modifier-install track() forwards nothing, the frame degrades to
        // CONSTANT_TAG, and rerender updates never reach the modifier/component.
        const classicTrackingActive = _trackingTagStack !== null && _trackingTagStack.length > 0;
        if (gxtTracking || cacheTrackingActive || classicTrackingActive) {
          for (let i = 0; i < _consumedTags.length; i++) {
            const tag = _consumedTags[i];
            if (tag == null) continue;
            try {
              // consumeTag() pushes into the top cache-tag tracker AND also
              // forwards to gxt's validator.consumeTag() for the gxt frame.
              consumeTag(tag);
            } catch {
              /* noop */
            }
          }
        }
      }
      return _lastValue;
    },
    destroy() {
      _consumedTags = [];
      _nestedCaches = [];
      _cells = [];
    },
    get tag() {
      return formula(fn, 'createCache');
    },
  };

  function _evaluate(): T {
    const consumed = new Set<any>();
    const nested = new Set<any>();
    const cells = new Set<any>();
    const readingFrame = _gxtGetTracker();
    _cacheFrameReaders.set(cells, readingFrame);
    _cacheTagTracker.push(consumed);
    _cacheEvalStack.push(nested);
    _gxtSetTracker(cells);
    try {
      return fn();
    } finally {
      _gxtSetTracker(readingFrame);
      _cacheEvalStack.pop();
      _cacheTagTracker.pop();
      _cells = Array.from(cells);
      _cellRevisions = _cells.map((c) => c._revision);
      // Store consumed tags and snapshots, snapshotting via
      // currentTagRevision() rather than tag.value. For GXT tagFor tags,
      // tag.value returns the underlying cell value (e.g. the number 4),
      // not a revision counter, and that cell value isn't bumped by the
      // dirtyTagFor path here — it's only updated if the mutation goes through
      // GXT's own trackedData.setter. The compat trackedData stores values
      // in a separate map and only calls gxtDirtyTagFor + markTagDirty, so
      // the dirty-revision bookkeeping here is the source of truth for cache
      // invalidation.
      _consumedTags = Array.from(consumed);
      _consumedTagSnapshots = _consumedTags.map((t) => {
        try {
          return currentTagRevision(t);
        } catch {
          return 0;
        }
      });
      // Store nested caches
      _nestedCaches = Array.from(nested);
      _nestedCacheRevisions = _nestedCaches.map((c) => c._revision || 0);
      // If fn() consumed no tags and no nested caches, it's constant.
    }
  }

  function _isValid(): boolean {
    if (!_initialized) return false;
    // Check consumed tags (from consumeTag calls during fn()) against their
    // snapshot revisions. currentTagRevision walks tag dependencies and
    // returns the max revision across the tree, so any mutation anywhere
    // bumps it strictly greater than the stored snapshot.
    for (let i = 0; i < _consumedTags.length; i++) {
      const tag = _consumedTags[i];
      if (tag == null) continue;
      try {
        if (currentTagRevision(tag) !== _consumedTagSnapshots[i]) return false;
      } catch {
        return false;
      }
    }
    // Check the gxt cells fn() read against their revisions then.
    for (let i = 0; i < _cells.length; i++) {
      if (_cells[i]._revision !== _cellRevisions[i]) return false;
    }
    // Check nested caches: trigger their re-validation by reading .value
    // This causes them to re-evaluate if their own dependencies changed,
    // potentially bumping their _revision.
    for (let i = 0; i < _nestedCaches.length; i++) {
      const nc = _nestedCaches[i];
      // Reading .value forces the nested cache to re-validate
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      nc.value;
      if (nc._revision !== _nestedCacheRevisions[i]) return false;
    }
    return true;
  }

  return cacheObj;
}

// Stack for tracking consumeTag calls during createCache evaluation
const _cacheTagTracker: Set<any>[] = [];

export function getValue<T>(cache: { value: T }): T {
  if (cache == null || typeof cache !== 'object') {
    throw new Error(
      `getValue() can only be used on an instance of a cache created with createCache(). Called with: ${String(cache)}`
    );
  }
  // Support both createCache objects and any object with a .value getter
  // (e.g. GXT cells, custom cache-like objects).
  return cache.value;
}

// Custom trackedData implementation that avoids infinite loops.
// The GXT version creates a formula that reads obj[key], which triggers the
// tracked getter again. This version uses internal WeakMap storage instead.
const trackedDataStorage = new WeakMap<
  object,
  Map<string | symbol, ReturnType<typeof createCell>>
>();

// Per-cell dependency tags for trackedData. The getter registers this tag
// with the active track() frame via consumeTag() so `track(() => getter(foo))`
// captures the dependency properly; the setter marks this tag dirty so
// subsequent `validateTag(trackTag, snapshot)` returns false on mutation.
// Lazily created on first getter/setter call per (obj,key). Using an object
// tag rather than the storage cell so consumeTag can push it into the
// tracking set (cells pass through the `value/dirty` short-circuit at the
// top of consumeTag and don't register with the track-frame stack).
const trackedDataTagStorage = new WeakMap<object, Map<string | symbol, any>>();
function _trackedDataTagFor(obj: object, key: string | symbol): any {
  let map = trackedDataTagStorage.get(obj);
  if (!map) {
    map = new Map();
    trackedDataTagStorage.set(obj, map);
  }
  let tag = map.get(key);
  if (!tag) {
    tag = { _isTrackedDataTag: true };
    map.set(key, tag);
  }
  return tag;
}

// Backtracking detection: track which cells have been read in the current
// computation frame. If a cell is read and then written in the same frame,
// that's a backtracking re-render which Ember disallows.
let _backtrackingFrame: Map<any, { key: string | symbol; obj: object }> | null = null;

let _backtrackingDebugName: string | null = null;

export function beginBacktrackingFrame(debugName?: string) {
  _backtrackingFrame = new Map();
  _backtrackingDebugName = debugName || null;
}

export function endBacktrackingFrame() {
  _backtrackingFrame = null;
}

// The tracked cells a render pass read (DEV): Glimmer's render tracking
// transaction. A tracked value the render read and then writes later in the
// same render asserts (`assertTrackedCellBacktrack`); a value it did not read
// does not. manager.ts opens and closes it with the render pass.
let _renderPassReads: WeakSet<object> | null = null;

export function beginRenderPassReads(): void {
  if (DEBUG) _renderPassReads = new WeakSet();
}

export function endRenderPassReads(): void {
  _renderPassReads = null;
}

// `fn()` outside the render pass's reads: what Glimmer runs after the render
// transaction, at commit (a modifier's install), neither consumes for the
// render nor asserts when it writes a value the render read.
export function outsideRenderPassReads<T>(fn: () => T): T {
  const reads = _renderPassReads;
  _renderPassReads = null;
  try {
    return fn();
  } finally {
    _renderPassReads = reads;
  }
}

// `fn()` untracked for the render pass: what Glimmer runs in an untrack frame
// inside the render (its curly manager creates a classic component and runs
// its lifecycle hooks untracked) consumes nothing, while a write of a value
// the render read still asserts.
let _renderPassUntrackDepth = 0;
export function untrackedForRenderPass<T>(fn: () => T): T {
  _renderPassUntrackDepth++;
  try {
    return fn();
  } finally {
    _renderPassUntrackDepth--;
  }
}

// beginBacktrackingFrame / endBacktrackingFrame are installed on the typed
// gxt-bridge by manager.ts. Readers in helper-manager.ts and
// ember-gxt-wrappers.ts go through
// `getGxtRenderer()?.backtracking.{begin,end}Frame`.

// Expose classic tag primitives for gxt-backend/manager.ts so component-arg
// own-property getters can participate in createCache/invokeHelper tag tracking.
// manager.ts imports them directly; cross-package callers use the typed
// `compilePipeline.classicDirtyTagFor` bridge method (see manager.ts's
// setGxtRenderer install).

// ── Tracked backtracking bookkeeping (reusable across cell backings) ─────────
// The DEV "You attempted to update `X` ... already used in the same
// computation" assertion is driven by two frames: `_backtrackingFrame`
// (render/helper computation, set by begin/endBacktrackingFrame) and
// `_debugTransactionConsumed` (an explicit `track()` frame). The read side
// records the consuming cell into both; the write side checks them and asserts.
//
// Shared by `trackedData`'s getter/setter (the classic storage-cell backing)
// and the Ember `@tracked` single-cell path, which backs a tracked property
// with the same `cellFor`/`tagFor` cell instead of a separate trackedData
// storage cell. The cell argument is opaque identity — any stable
// per-property object works.
export function recordTrackedCellRead(cell: any, key: string | symbol, obj: object): void {
  // Record this read in the backtracking frame
  if (_backtrackingFrame !== null) {
    _backtrackingFrame.set(cell, { key, obj });
  }
  // The render pass: as in Glimmer, a read consumes only inside a tracking
  // frame (a binding computing its value, a `track()` or cache frame), not in
  // `untrack` nor outside any frame. Glimmer's curly manager creates a classic
  // component and runs its lifecycle hooks untracked.
  if (
    DEBUG &&
    _renderPassReads !== null &&
    _localUntrackDepth === 0 &&
    _renderPassUntrackDepth === 0 &&
    cell !== null &&
    typeof cell === 'object' &&
    (_gxtGetTracker() !== null ||
      (_trackingTagStack !== null && _trackingTagStack.length > 0) ||
      _cacheTagTracker.length > 0)
  ) {
    _renderPassReads.add(cell);
  }
  // Debug tracking transaction: record the cell as consumed so a subsequent
  // setter call in the same transaction can detect the backtracking update.
  if (_debugTransactionConsumed !== null) {
    _debugTransactionConsumed.add(cell);
    _debugTransactionLabelForTag?.set(
      cell,
      `${String(key)}\` on \`${(obj as any)?.constructor?.name || 'Object'}`
    );
  }
}

// The backtracking assertion's text for a write of `key` on `obj`, first used
// by `firstUse` (a line of the render tree).
function backtrackingMessage(key: string | symbol, obj: any, firstUse: string): string {
  // Try to get a useful name: class name, toString, or fallback
  const objName =
    obj?.constructor?.name && obj.constructor.name !== 'Object'
      ? obj.constructor.name
      : obj?.toString?.() !== '[object Object]'
        ? obj?.toString?.()
        : '<unknown>';
  return `You attempted to update \`${String(key)}\` on \`${objName}\`, but it had already been used previously in the same computation. Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.\n\n\`${String(key)}\` was first used:\n\n- While rendering:\n  -top-level\n    ${firstUse}\n\nStack trace for the update:`;
}

export function assertTrackedCellBacktrack(cell: any, key: string | symbol, obj: object): void {
  // Backtracking detection: if this cell was read in the current render/helper
  // frame, writing it is backtracking.
  if (_backtrackingFrame !== null && _backtrackingFrame.has(cell)) {
    const info = _backtrackingFrame.get(cell)!;
    // Clear the frame before calling assert to prevent recursion
    _backtrackingFrame = null;
    const renderTree = _backtrackingDebugName
      ? `(result of a \`${_backtrackingDebugName}\` helper)`
      : '(unknown)';
    const msg = backtrackingMessage(info.key, info.obj ?? obj, renderTree);
    const assertDirect = getEmberAssertDirect();
    if (typeof assertDirect === 'function') {
      assertDirect(msg, false);
    }
  }
  // The render pass: the render read this cell earlier (a parent component's
  // template rendered it before a child's constructor writes it).
  if (DEBUG && _renderPassReads !== null && _renderPassReads.has(cell)) {
    const assertDirect = getEmberAssertDirect();
    if (typeof assertDirect === 'function') {
      assertDirect(backtrackingMessage(key, obj, '(unknown)'), false);
    }
  }
  // Debug tracking transaction: if this cell was read earlier in the current
  // runInTrackingTransaction frame or track() frame, surface the Ember-style
  // assertion matching classic @glimmer/validator behavior.
  if (_debugTransactionConsumed !== null && _debugTransactionConsumed.has(cell)) {
    const label = _debugTransactionLabelForTag?.get(cell);
    const msg = `You attempted to update \`${label}\`, but it had already been used previously in the same computation`;
    const assertDirect = getEmberAssertDirect();
    if (typeof assertDirect === 'function') {
      assertDirect(msg, false);
    } else {
      throw new Error(`Assertion Failed: ${msg}`);
    }
  }
}

export function trackedData<T, K extends string | symbol>(
  key: K,
  initializer?: () => T
): { getter: (obj: object) => T; setter: (obj: object, value: T) => void } {
  return {
    getter(obj: object): T {
      let objStorage = trackedDataStorage.get(obj);
      if (!objStorage) {
        objStorage = new Map();
        trackedDataStorage.set(obj, objStorage);
      }

      let cellForKey = objStorage.get(key);
      if (!cellForKey) {
        // Initialize with the initializer if provided, otherwise undefined
        const initialValue = initializer ? initializer.call(obj) : undefined;
        cellForKey = createCell(initialValue, `tracked:${String(key)}`);
        objStorage.set(key, cellForKey);
      }

      // Record this read for backtracking detection (render/helper frame +
      // track() debug transaction). See `recordTrackedCellRead` above.
      recordTrackedCellRead(cellForKey, key, obj);

      // Register this cell's tag with the active track() / createCache frame
      // so `track(() => getter(obj))` captures the dependency. Without this,
      // an empty frame would return CONSTANT_TAG and `validateTag(tag, snap)`
      // would never invalidate after a setter call.
      consumeTag(_trackedDataTagFor(obj, key));

      return cellForKey.value as T;
    },
    setter(obj: object, value: T): void {
      let objStorage = trackedDataStorage.get(obj);
      if (!objStorage) {
        objStorage = new Map();
        trackedDataStorage.set(obj, objStorage);
      }

      let cellForKey = objStorage.get(key);
      if (!cellForKey) {
        cellForKey = createCell(value, `tracked:${String(key)}`);
        objStorage.set(key, cellForKey);
      } else {
        // Backtracking detection (render/helper frame + track() debug
        // transaction). See `assertTrackedCellBacktrack` above.
        assertTrackedCellBacktrack(cellForKey, key, obj);
        cellForKey.value = value;
      }
      // Also bump the global revision counter so track() tags that
      // depend on this cell via a cell read (no explicit consumeTag)
      // invalidate on mutation. Real Ember tracked decorators route
      // through dirtyTagFor which handles this — this covers the
      // test-only path that uses trackedData() directly.
      globalRevisionCounter++;
      try {
        currentTagCell.value = globalRevisionCounter;
      } catch {
        /* noop */
      }
      // Mark this cell's tag dirty so any track() frame that consumed it
      // via the getter will see `validateTag(tag, snapshot) === false`.
      markTagDirty(_trackedDataTagFor(obj, key));
    },
  };
}

// Global revision counter - this gets bumped whenever any tag is dirtied
let globalRevisionCounter = 0;

// CURRENT_TAG is a special tag that represents the current global revision
// It's used by the observer system to detect if any tags have changed
const currentTagCell: any = cell(globalRevisionCounter, 'CURRENT_TAG');
// Mark as non-dirtyable/non-updatable so dirtyTag/updateTag can throw on it.
currentTagCell._isNonDirtyable = true;
currentTagCell._isNonUpdatable = true;
currentTagCell._isCurrent = true;
export const CURRENT_TAG = currentTagCell;

// Classic-tag bridge cell: a native GXT Cell (not wrapped by storage primitive)
// that is bumped on every dirtyTagFor call. Exposed so classic components
// rendered via GXT effects (e.g., LinkTo.href/class getters that call
// consumeTag(tagFor(routing,'currentState'))) can subscribe once per effect
// to receive re-fire notifications on ANY classic tag mutation.
//
// Using a raw Cell from @lifeart/gxt (not via storage.createStorage) guarantees
// the cell's identity matches what GXT's effect/tracker system manipulates,
// so reads during effect evaluation properly register a subscription.
const _classicBridgeCell = _gxtNativeCell(0, 'classic-validator-bridge');
let _classicBridgeCounter = 0;
function _bumpClassicBridge() {
  _classicBridgeCounter++;
  try {
    _classicBridgeCell.update(_classicBridgeCounter);
  } catch {
    /* noop */
  }
}
// Touch from inside an effect to subscribe: read .value.
// Export a helper so manager.ts can call it without caring about Cell shape.
export function touchClassicBridge(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _classicBridgeCell.value;
  } catch {
    /* noop */
  }
}

// Side-channel registry for effects that must re-fire on ANY classic tag
// mutation. Used as a fallback for rendering paths where GXT's effect
// scheduler doesn't pick up the classic-bridge cell dirty (e.g., when the
// effect is created outside an active render/sync cycle). Callbacks are
// invoked synchronously at the end of dirtyTagFor after the classic tag
// has been updated but before the runloop flush. Registrants are expected
// to be idempotent and cheap.
// Leak detection: each reactor is tagged with metadata at registration
// time so cross-test leakage can be detected — a reactor registered during
// test A that fires during test B is by definition a leak.
interface ReactorMeta {
  id: number;
  source: string;
  registeredAtTest: string;
  registeredAtTime: number;
  fireCount: number;
  // Per-foreign-test fire count (resets when foreign test changes).
  // Catches fast leaks where a single test triggers many cross-test
  // fires.
  foreignFires: number;
  // Cumulative fires across ALL foreign tests (never reset). Catches
  // slow leaks where fires are spread across many tests but never
  // concentrate enough in any one to hit the per-test cap.
  totalForeignFires: number;
  // The most recent foreign test name fires were counted for. When
  // _fireClassicReactors observes a different foreign test (or
  // returns to the registration test), foreignFires is reset.
  foreignTest: string;
  // True after the reactor has hit a foreign-fire cap. Soft-disabled
  // reactors stay in _classicReactors (so iteration over the Set is
  // unchanged — the classic-tag bridge mechanics that some tests
  // rely on stay intact) but their cb is not invoked. This avoids
  // the expensive work without disturbing the bridge.
  disabled: boolean;
}
let _reactorIdCounter = 0;
const _reactorMeta = new WeakMap<() => void, ReactorMeta>();
const _classicReactors = new Set<() => void>();

function _currentTestName(): string {
  try {
    const Q = (globalThis as any).QUnit;
    const t = Q?.config?.current;
    if (t) return `${t.module?.name || ''} :: ${t.testName || ''}`;
  } catch {
    /* ignore */
  }
  return '<no-test>';
}

export function registerClassicReactor(cb: () => void, source?: string): () => void {
  _classicReactors.add(cb);
  // Always track metadata — the cross-test foreign-fire cap below is
  // production behavior, not just diagnostic. Cheap (one WeakMap put).
  const id = ++_reactorIdCounter;
  _reactorMeta.set(cb, {
    id,
    source: source || '<unknown>',
    registeredAtTest: _currentTestName(),
    registeredAtTime: Date.now(),
    fireCount: 0,
    foreignFires: 0,
    totalForeignFires: 0,
    foreignTest: '',
    disabled: false,
  });
  return () => {
    _classicReactors.delete(cb);
    _reactorMeta.delete(cb);
  };
}

// Hard cap on TOTAL fires (any test). Catches the rare case where a
// reactor is in a tight self-fire loop within one test. 50,000 is far
// above any plausible legitimate bound.
const REACTOR_FIRE_HARD_CAP = 50_000;

// Cap on fires WITHIN A SINGLE foreign test (catches fast leaks).
const REACTOR_FOREIGN_FIRE_CAP = 100;
// Cap on cumulative fires across all foreign tests (never resets).
// Hard-unsubscribing a capped reactor (removing it from _classicReactors)
// would break the side-channel classic-tag bridge mechanics other rendering
// relies on. Instead, soft-disable: keep the reactor in _classicReactors so
// iteration cost is paid (preserving the bridge bookkeeping) but skip
// invoking cb (the expensive work that produces the runaway). The cap can
// stay low since the soft disable doesn't disturb the bridge.
const REACTOR_TOTAL_FOREIGN_FIRE_CAP = 200;
const NO_TEST_SENTINEL = '<no-test>';

function _fireClassicReactors() {
  if (_classicReactors.size === 0) return;
  // Copy to avoid mutation during iteration
  const snapshot = Array.from(_classicReactors);
  const currentTest = _currentTestName();
  for (const cb of snapshot) {
    const meta = _reactorMeta.get(cb);
    if (meta) {
      // Already soft-disabled — skip the call, leave it in the Set.
      if (meta.disabled) {
        continue;
      }
      meta.fireCount++;
      if (meta.fireCount > REACTOR_FIRE_HARD_CAP) {
        meta.disabled = true;
        continue;
      }
      const isForeign =
        meta.registeredAtTest !== NO_TEST_SENTINEL &&
        currentTest !== NO_TEST_SENTINEL &&
        meta.registeredAtTest !== currentTest;
      if (isForeign) {
        if (meta.foreignTest !== currentTest) {
          meta.foreignTest = currentTest;
          meta.foreignFires = 0;
        }
        meta.foreignFires++;
        meta.totalForeignFires++;
        if (
          meta.foreignFires > REACTOR_FOREIGN_FIRE_CAP ||
          meta.totalForeignFires > REACTOR_TOTAL_FOREIGN_FIRE_CAP
        ) {
          meta.disabled = true;
          continue;
        }
      } else {
        meta.foreignTest = '';
        meta.foreignFires = 0;
      }
    }
    try {
      cb();
    } catch {
      /* ignore individual reactor errors */
    }
  }
}

// Component-arg propagation scope. manager.ts runs its arg propagation in it:
// the sync's write-back of a parent's new arg value onto a child
// (`_dispatchArgWrite`) and the effect that dirties a child's classic arg tag
// when the arg changes (`_installArgDirtyEffect`). A `dirtyTagFor` inside the
// scope does not fire the classic reactors: the reactors are a fallback for
// classic mutations GXT does not see, and such a dirty is GXT handing a
// parent's arg value on to a child, a change GXT is already propagating.
let _argPropagationDepth = 0;
export function withArgPropagation<T>(fn: () => T): T {
  _argPropagationDepth++;
  try {
    return fn();
  } finally {
    _argPropagationDepth--;
  }
}

// Wrap dirtyTagFor to also bump the global revision AND mark the specific tag as dirty
const gxtDirtyTagFor = validator.dirtyTagFor;

export function dirtyTagFor(obj: any, key: any) {
  // Convert Symbol keys to safe string representation
  const safeKey = typeof key === 'symbol' ? key.description || String(key) : key;

  // Bump global revision first
  globalRevisionCounter++;
  currentTagCell.value = globalRevisionCounter;
  // Also bump the classic-tag bridge cell so GXT effects that subscribed via
  // touchClassicBridge() will be re-scheduled on any classic tag mutation.
  _bumpClassicBridge();

  // Get the tag for this property and mark it as dirty
  const tag = tagFor(obj, safeKey);
  if (tag && typeof tag === 'object') {
    markTagDirty(tag);
  }
  // Invalidate the tag itself, as Glimmer does, so that what consumed it
  // re-renders: a build-time template's read of the property (`$__tag(obj,
  // key)`) consumed it. gxt's own `dirtyTagFor` below re-validates it only
  // when the value it holds changed, and a property tag holds none.
  const propertyTag = _gxtPeekTagFor(obj, safeKey);
  if (propertyTag !== undefined) {
    _gxtDirtyCell(propertyTag);
  }

  // Mark GXT sync as pending so the next `_gxtSyncDomNow` processes this
  // change; otherwise set() on a component would dirty tags without any sync.
  //
  // Skip scheduling (but preserve dirty-tag semantics above) during rcSet
  // internal arg write-backs. Those writes fire rcSet → dirtyTagFor;
  // rescheduling another sync triggers a backburner re-entry loop. The tag
  // still needs to be marked dirty and the global revision bumped so
  // within-sync template re-reads see the new value. Before the bridge is
  // installed the predicate is `undefined`, so the schedule call runs.
  if (!getGxtRenderer()?.compilePipeline.isDirtyInRcSetSuppressed?.()) {
    getGxtRenderer()?.compilePipeline.setPendingSync?.(true);

    // Notify the scheduler (typically _backburner.ensureInstance()) so that the
    // backburner run loop drains and flushAsyncObservers fires. Without this,
    // @tracked setter → dirtyTagFor outside an explicit run() never starts a
    // run loop, so async observers watching dependentKeyCompat getters never
    // get flushed.
    try {
      const sr = (_glimmerGlobalContext as any).scheduleRevalidate;
      if (typeof sr === 'function') sr();
    } catch {
      /* noop */
    }
  }

  // Then call the original dirtyTagFor with the safe key
  let result: any;
  try {
    // Ensure obj has a constructor for GXT's debug label
    if (obj && typeof obj === 'object' && !obj.constructor) {
      Object.defineProperty(obj, 'constructor', {
        value: Object,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    result = gxtDirtyTagFor(obj, safeKey);
  } catch {
    // GXT's dirtyTagFor may fail for objects without constructor
  }
  // Fire side-channel classic reactors. These are callbacks registered by
  // GXT-rendered classic components (e.g. LinkTo) whose template getters
  // call consumeTag() from classic @glimmer/validator — a code path that
  // GXT's tracker doesn't observe reliably. Firing them here ensures
  // effects re-read their reactive classic values on every tag mutation.
  //
  // Not while GXT propagates a component arg (`withArgPropagation`): such a
  // dirty is GXT handing a parent's arg value on to a child, a change GXT is
  // already propagating, not a classic mutation it missed.
  if (_argPropagationDepth === 0) {
    _fireClassicReactors();
  }
  // Helper autotracking fallback: stamp every `__managerBucket` entry of
  // ember-gxt-wrappers.ts's helper cache. The custom-manager buckets there no
  // longer keep an arg-serialization dedup (their `getValue` is a cache over
  // the args and the tags compute() consumed, helper-manager.ts), so for them
  // the stamp is inert; the entry that reacts is the tag-dirty sentinel,
  // whose `lastArgsSer` setter clears compile.ts's tag-helper dedup keys.
  // That covers tag helpers that close over non-argument @tracked state
  // (e.g. a class-based helper reading a module-level tracked instance).
  //
  // Note: delegate.getValue is NOT re-run here, because
  //   (a) it would double-count user-visible compute() invocations, and
  //   (b) dirtyTagFor can fire multiple times during one logical mutation.
  // The natural cell-propagation path (the tracked setter writes the
  // underlying cell via trackedData) handles re-rendering; the only job here
  // is to make sure the cache doesn't serve stale data to that re-render.
  try {
    // Read through the get-only typed-bridge accessor
    // `compilePipeline.getClassHelperInstanceCache?.()` (registered by
    // `ember-gxt-wrappers.ts`'s `installCompilePipelinePart`). The optional
    // chain returns undefined when `ember-gxt-wrappers.ts` has not yet
    // executed its bridge install (extremely-early classic-tag-dirty firing
    // during module init), in which case the `if (helperCache && ...)` guard
    // short-circuits. See `getClassHelperInstanceCache` doc in gxt-bridge.ts.
    const helperCache = getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.() as
      | Map<string, any>
      | undefined;
    if (helperCache && helperCache.size > 0) {
      // forEach, NOT for…of: the gxt runtime patches Map.prototype's
      // Symbol.iterator/entries/keys/values for Map reactivity, so a for…of
      // here — which can run inside a render formula frame (any set() during
      // render lands in dirtyTagFor) — lazily creates a reactivity cell for
      // this bookkeeping Map. Every later cache.set() inside a helper effect
      // then subscribes that effect to the cache, and any subsequent cache
      // mutation re-fires all such effects — including stale ones from
      // already-collapsed {{#if}} branches. Native forEach is not patched and
      // keeps this infrastructure Map invisible to tracking.
      helperCache.forEach((cached) => {
        if (!cached || cached.__managerBucket !== true) return;
        cached.lastArgsSer = '__classic_tag_dirty__' + globalRevisionCounter;
      });
    }
  } catch {
    /* noop */
  }
  return result;
}

export function consumeTag(tag: any) {
  if (!tag) {
    // Empty tags can be safely ignored
    return;
  }

  // Inside a local untrack frame, skip registration with our own
  // tracking/cache frames (but still forward to gxt's validator below
  // so its internal tracker state stays consistent).
  if (_localUntrackDepth === 0) {
    // Collect this tag in the current track() frame if active
    if (_trackingTagStack && _trackingTagStack.length > 0) {
      _trackingTagStack[_trackingTagStack.length - 1]!.add(tag);
    }

    // Register in createCache tracker stack for fine-grained invalidation
    if (_cacheTagTracker.length > 0) {
      _cacheTagTracker[_cacheTagTracker.length - 1]!.add(tag);
    }

    // Debug tracking transaction: remember this tag as "consumed in the
    // current transaction" so a later dirty can detect a backtracking
    // read-then-write in DEV builds.
    if (_debugTransactionConsumed !== null) {
      _debugTransactionConsumed.add(tag);
    }
  }

  // A helper-argument tag lives only in the shim's own frames (registered
  // above); it is not a GXT cell, so it is never handed to GXT's tracker.
  if (tag._isHelperArgsTag === true) {
    return;
  }

  // A tag that depends on an argument's tag (a computed property whose
  // dependent key goes through a component argument): the reader also
  // consumes what the argument's tag combines (`argumentTag`).
  const deps = updatableTagDependencies.get(tag);
  if (deps !== undefined) {
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i];
      if (dep !== null && typeof dep === 'object' && _argumentTags.has(dep)) {
        const constituents = combinedTagConstituents.get(dep);
        if (constituents !== undefined) {
          for (let j = 0; j < constituents.length; j++) validator.consumeTag(constituents[j]);
        }
      }
    }
  }

  // Our custom updatable tags (from createUpdatableTag) are objects with a
  // cell-backed `value` getter. Reading `.value` establishes GXT tracking so
  // that formulas depending on this tag re-evaluate when `dirty()` is called.
  if (typeof tag === 'object' && 'value' in tag && 'dirty' in tag) {
    // Read the cell value to track it in any enclosing GXT formula
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tag.value;
    return;
  }
  return validator.consumeTag(tag);
}

// A constant tag that never changes
export const CONSTANT_TAG = 11;

// `VOLATILE_TAG` and `bump()` are not reached by any live GXT-mode runtime path
// (test-only); they live in `./validator-vm-compat`. (`validateTag` /
// `currentTagRevision` detect volatility via the `_isVolatile` PROPERTY, not the
// `VOLATILE_TAG` const, so this module needs neither.)

// Allow cycles in tag dependencies - WeakMap to track which tags allow cycles
export const ALLOW_CYCLES = new WeakMap<object, boolean>();

// Track combined tags and their constituents
const combinedTagConstituents = new WeakMap<object, any[]>();

// Track updatable tag dependencies (for updateTag)
const updatableTagDependencies = new WeakMap<object, any[]>();

// Combine multiple tags into a single computed tag.
//
// This intentionally does NOT wrap the result in a GXT `formula(...)`: that
// would eagerly read each constituent tag's `.value` at combine-time. For
// cells installed by `cellFor` on classic CP-backed properties, reading
// `.value` invokes the user's getter (the cell's fn wraps the classic CP
// getter), which is a forbidden side effect — classic Ember must be able to
// combine dependency tags without running any CP user code. Instead, return a
// plain marker object and rely on `currentTagRevision()` to walk the
// registered constituents lazily when `validateTag`/`valueForTag` is asked.
export function combine(tags: any[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return CONSTANT_TAG;
  }
  const combinedTag: any = { _isCombinedTag: true };
  Object.defineProperty(combinedTag, 'value', {
    get() {
      return currentTagRevision(combinedTag);
    },
  });
  combinedTagConstituents.set(combinedTag, tags);
  return combinedTag;
}

// globalRevisionCounter is the single source of truth for all revisions, so
// dirty tags and snapshot revisions are comparable.

// Track dirty revisions - when a tag was last dirtied (in globalRevisionCounter space)
const tagDirtyRevision = new WeakMap<object, number>();

// Mark a tag as dirtied at the current revision (uses globalRevisionCounter)
function markTagDirty(tag: any): void {
  // globalRevisionCounter was already bumped by dirtyTagFor before calling us
  const rev = globalRevisionCounter;
  tagDirtyRevision.set(tag, rev);
}

// Helper-argument tags. A helper's arguments are references (Glimmer's
// `argsProxyFor`): reading an argument consumes it, and a helper's cached
// value goes stale only when an argument it read has changed. The compat
// helper wrapper (helper-manager.ts) keeps a helper's current argument values
// in plain storage and signals a change through one of these tags.
//
// They are seen only by the shim's own frames (`createCache`, `track()`,
// begin/endTrackFrame): `consumeTag` registers them there and never forwards
// them to GXT's tracker. `bumpHelperArgsTag` moves the tag past every earlier
// revision, so a cache or a combined tag that consumed it is invalidated; it
// touches no GXT cell (CURRENT_TAG's included), so it does not dirty the
// formula that is reading the helper, does not bump the classic bridge, does
// not fire the classic reactors and does not schedule a sync. A formula that
// renders a helper already depends on the argument sources it evaluated.
export function createHelperArgsTag(): object {
  return { _isHelperArgsTag: true };
}

export function bumpHelperArgsTag(tag: object): void {
  globalRevisionCounter++;
  tagDirtyRevision.set(tag, globalRevisionCounter);
}

// Compute the current "revision" for a tag by taking the max of its own
// dirty revision and all its dependencies' revisions. This mirrors how
// Glimmer VM's tag.value works: it returns the max revision across the
// entire dependency tree, so any mutation anywhere increases the value.
function currentTagRevision(tag: any, visited = new Set<any>(), stack?: Set<any>): number {
  if (!tag || typeof tag !== 'object') return 0;
  // Cycle detection: `stack` tracks the active recursion path. A tag already
  // on the stack indicates a true cycle. Unless ALLOW_CYCLES permits it,
  // throw — matching classic @glimmer/validator behavior. Real callers never
  // form tag cycles, so this only fires in tests.
  if (stack && stack.has(tag)) {
    // The cycle ASSERT is a DEBUG-only behavior, matching classic
    // @glimmer/validator: metal only populates ALLOW_CYCLES under DEBUG
    // (computed.ts), and stock validateTag only runs its cycle check in DEV
    // builds. In production the walk must simply terminate — "computeds can
    // have cycles" is supported behavior there.
    if (!DEBUG || ALLOW_CYCLES.get(tag) === true) {
      return 0;
    }
    throw new Error('Cycles in tags are not allowed');
  }
  // Non-cycle revisit (DAG with shared deps): use cached visited short-circuit.
  if (visited.has(tag)) return 0;
  visited.add(tag);
  const activeStack = stack ?? new Set<any>();
  activeStack.add(tag);

  try {
    // VOLATILE_TAG is always strictly newer than any snapshot.
    if (tag._isVolatile === true) {
      return Number.MAX_SAFE_INTEGER;
    }

    // CURRENT_TAG reflects the live global revision counter.
    if (tag._isCurrent === true) {
      return globalRevisionCounter;
    }

    let max = tagDirtyRevision.get(tag) || 0;

    // Check combined tag constituents
    const constituents = combinedTagConstituents.get(tag);
    if (constituents) {
      for (const c of constituents) {
        const r = currentTagRevision(c, visited, activeStack);
        if (r > max) max = r;
      }
    }

    // Check updateTag dependencies (e.g., autoComputed links propertyTag → trackTag)
    // Buffered subtag semantics (classic @glimmer/validator): when updateTag
    // was called, it captured the deps' current revision as `_subBufferRevision`.
    // While deps stay <= buffer, they are masked and the tag reports its
    // `_lastValue` (classic's `lastValue` on MonomorphicTagImpl). Once a dep
    // moves past the buffer, the mask clears one-time: _lastValue is bumped to
    // the dep's revision and the buffer is dropped so subsequent reads don't re-mask.
    const deps = updatableTagDependencies.get(tag);
    if (deps) {
      const bufferRev = tag._subBufferRevision;
      let hasBuffer = typeof bufferRev === 'number';
      let depMaxOverBuffer = 0;
      let maxDepRev = 0;
      for (const d of deps) {
        const r = currentTagRevision(d, visited, activeStack);
        if (r > maxDepRev) maxDepRev = r;
        if (hasBuffer && r <= bufferRev) {
          // masked — dep is within buffer window, use _lastValue below
          continue;
        }
        if (r > depMaxOverBuffer) depMaxOverBuffer = r;
      }
      if (hasBuffer) {
        if (depMaxOverBuffer > 0) {
          // A dep broke past the buffer: classic semantics clear the buffer
          // and raise lastValue to the new dep revision.
          const newLast = Math.max(tag._lastValue || 0, depMaxOverBuffer);
          tag._lastValue = newLast;
          tag._subBufferRevision = undefined;
          if (newLast > max) max = newLast;
        } else {
          // All deps masked — report the previously stored lastValue so
          // downstream consumers (e.g. observer snapshots taken before the
          // buffer was set up) don't see spurious bumps.
          const lastValue = tag._lastValue || 0;
          if (lastValue > max) max = lastValue;
        }
      } else {
        // No buffer — include the raw dep max.
        if (maxDepRev > max) max = maxDepRev;
      }
    }

    // For updatable tags (createUpdatableTag), reading .value gives the cell value
    // which acts as a revision (bumped by .dirty())
    if ('dirty' in tag && 'value' in tag) {
      const v = tag.value;
      if (typeof v === 'number' && v > max) max = v;
    }

    return max;
  } finally {
    activeStack.delete(tag);
  }
}

export function validateTag(tag: any, revision?: number): boolean {
  if (!tag) {
    return true; // Null tags are always valid
  }

  // If no revision provided, always consider valid
  if (revision === undefined) {
    return true;
  }

  // Volatile tag: always invalid. Also any combined tag containing a
  // volatile is invalid.
  if (tag._isVolatile === true) return false;
  if (tag._isCombinedTag === true) {
    const cs = combinedTagConstituents.get(tag);
    if (cs) {
      for (const c of cs) {
        if (c && c._isVolatile === true) return false;
      }
    }
  }

  // Special handling for CURRENT_TAG - compare its value directly to revision
  if (tag === CURRENT_TAG) {
    return tag.value <= revision;
  }

  // The tag is valid if its current revision hasn't changed since the snapshot.
  // currentTagRevision walks the dependency tree (including track tags and
  // combined tags) and returns the max dirty revision.
  return currentTagRevision(tag) <= revision;
}

// Reset tracking state (used in testing).
// Mirrors classic @glimmer/validator's resetTracking ("This function is only
// for handling errors and resetting to a valid state"): a render that throws
// mid-frame (e.g. the classic VM's beginCacheGroup with no matching
// commitCacheGroup on the unwind path) strands open frames. The test harness
// calls this at every testStart; otherwise the stranded frames would keep
// isTracking() true for every later test.
export function resetTracking() {
  _manualTrackFrameStack.length = 0;
  _trackingTagStack = null;
  _localUntrackDepth = 0;
  _cacheTagTracker.length = 0;
  _cacheEvalStack.length = 0;
  _debugTransactionConsumed = null;
  _debugTransactionLabelForTag = null;
  // Drain GXT's own frame stack too — the stranded gxtBeginTrackFrame calls
  // live in the dist's internal stack, observable only via gxtIsTracking().
  for (let i = 0; i < 1024 && gxtIsTracking(); i++) {
    try {
      gxtEndTrackFrame();
    } catch {
      break;
    }
  }
}

// Special revision values
export const COMPUTE = 13;
export const INITIAL = 31;

// Get the current revision value for a tag
// This returns the revision number that can be used with validateTag later.
// For consistency with validateTag, this walks the dependency tree to get
// the max revision. The stored value can later be compared with a fresh
// currentTagRevision() call to detect changes.
export function valueForTag(tag: any): number {
  if (!tag) return 0;
  if (typeof tag === 'number') return tag;

  // Special handling for CURRENT_TAG
  if (tag === CURRENT_TAG) {
    return tag.value;
  }

  // Use currentTagRevision to get the max revision across all dependencies.
  // This ensures the snapshot stored by meta.setRevisionFor() is in the same
  // space as what validateTag checks.
  if (typeof tag === 'object') {
    return currentTagRevision(tag);
  }

  return 0;
}

// Create an updatable tag
let _updatableTagRevision = 0;
export function createUpdatableTag() {
  const value = cell(0, 'updatableTag');
  const tag: any = {
    _isUpdatable: true,
    _isDirtyable: true,
    // Marks this as a plain createUpdatableTag (the tag backing custom `cell()`s,
    // classic `@glimmer/validator` updatable tags, and the per-index
    // reactive-collection storages). Used by `dirtyTag` to route its DOM flush
    // through the COALESCED, non-clearing `_scheduleCollectionFlush()` (see
    // `dirtyTag`). The classic-CP / `@tracked` path never reaches `dirtyTag`
    // (it goes through `dirtyTagFor`), and `tagFor()` cells / `createTag()`
    // dirtyable-only tags do NOT carry this marker — so the routing is scoped
    // to exactly these tags.
    _isUpdatableCellTag: true,
    get value() {
      return value.value;
    },
    dirty() {
      value.value = ++_updatableTagRevision;
    },
  };
  return tag;
}

// Native-cell-backed updatable tag. Identical shape to `createUpdatableTag`,
// but its inner cell is a NATIVE GXT cell (`_gxtNativeCell`) rather than the
// `glimmer-compatibility` storage-wrapped `cell` used above. The storage-
// wrapped cell does NOT entangle reads with GXT's effect/formula tracker:
// reading its `.value` inside a
// `formula`/`effect` does not register a subscription, so a later `dirty()`
// does not re-fire that formula. The native cell DOES entangle (`qt.add(cell)`
// in its `value` getter). Used by the reactive collections (trackedArray /
// trackedSet) for their structural `collection` tag, so the gxt-backend
// each-source formula can subscribe to it (via the `GXT_COLLECTION_TAG`
// accessor + `_innerCell.value` read) and re-fire the keyed list opcode on an
// in-place push/splice/swap/length=0. `createUpdatableTag` itself is left
// unchanged: its storage-wrapped backing is load-bearing across the
// classic-CP tag bridge (cellFor / dirtyTagFor) and the test suite depends on
// its current revision/validation semantics.
export function createUpdatableTagNative() {
  const value = _gxtNativeCell(0, 'updatableTagNative');
  const tag: any = {
    _isUpdatable: true,
    _isDirtyable: true,
    _innerCell: value,
    get value() {
      return value.value;
    },
    dirty() {
      value.value = ++_updatableTagRevision;
    },
  };
  return tag;
}

// Update a tag to depend on another tag (or array of tags)
// This is used by computed properties to link the property tag to its dependency tags
export function updateTag(outer: any, inner: any) {
  // Throw on non-updatable markers: CONSTANT_TAG (number), VOLATILE_TAG,
  // CURRENT_TAG, combined tags, and dirtyable-only tags from createTag().
  if (
    typeof outer === 'number' ||
    (outer &&
      typeof outer === 'object' &&
      (outer._isNonUpdatable === true ||
        outer._isCombinedTag === true ||
        outer._isVolatile === true ||
        outer._isDirtyableOnly === true))
  ) {
    throw new Error('Attempted to update a tag that was not updatable');
  }

  if (!outer || !inner) return;

  // Buffered update semantics (matches classic @glimmer/validator):
  // capture the inner tag's current revision at update time, so that
  // validateTag(outer, snapshot) remains valid until inner is dirtied
  // again AFTER the update call. Classic buffers unconditionally; do
  // the same here so tags returned from `tagFor()` (GXT Cells) get the same
  // treatment as `_isUpdatable` tags from `createUpdatableTag()`.
  //
  // This is essential for the "observers that do not consume computed
  // properties still work" invariant: when a CP's getter is finally read
  // and `updateTag(cpTag, chainOfDepKeys)` fires, the deps may have
  // already been dirtied at earlier revisions. Without buffering, those
  // older dep revisions leak through `currentTagRevision(cpTag)` and make
  // an observer snapshot taken before any mutation look invalid.
  //
  // Classic also maintains a monotonically-increasing `lastValue` that
  // records the outer's reported revision. We seed it from the current
  // revision so downstream consumers continue to see at least what they
  // saw before this updateTag call (avoiding "revision moves down" bugs
  // when buffering masks a dep that previously propagated).
  if (outer && typeof outer === 'object') {
    const innerRev = currentTagRevision(inner);
    const prevLast = outer._lastValue || 0;
    // Seed lastValue to the max of its previous value and the outer's own
    // raw dirty/constituent revision. This preserves monotonicity of
    // `currentTagRevision(outer)` across updateTag calls.
    const ownDirty = tagDirtyRevision.get(outer) || 0;
    outer._lastValue = Math.max(prevLast, ownDirty);
    outer._subBufferRevision = innerRev;
  }

  // NOTE: intentionally do NOT call `outer.update(inner)` here, even when
  // outer exposes an `update` method. Classic @glimmer/validator's updateTag
  // only sets a subtag reference and a buffered revision — it does NOT bump
  // the outer tag's own revision. GXT Cells returned from `tagFor()` DO have
  // an `update(value)` method, but calling it writes to the cell, which
  // bumps its revision and spuriously invalidates observers that registered
  // on the outer tag (e.g. computed-property observers firing when only an
  // upstream dep changed, before the CP was ever consumed). Dependency
  // tracking below (updatableTagDependencies + buffered revision above) is
  // sufficient to propagate real invalidations via currentTagRevision().

  // Store the dependency relationship for validation
  // inner can be a single tag or an array of tags (from combine())
  const deps: any[] = [];
  if (Array.isArray(inner)) {
    deps.push(...inner);
  } else if (typeof inner === 'object' && inner !== null) {
    deps.push(inner);
    // Also check if inner is a combined tag and get its constituents
    const constituents = combinedTagConstituents.get(inner);
    if (constituents) {
      deps.push(...constituents);
    }
  } else if (typeof inner === 'number') {
    // inner is a number constant (e.g., CONSTANT_TAG = 11), no deps to track
  }

  if (deps.length > 0) {
    updatableTagDependencies.set(outer, deps);
  }
}

// Local untrack depth for the test-facing tracking API. When > 0,
// consumeTag() will not register the tag with the active track/cache
// frame, and isTracking() reports false. The GXT untrack is still delegated
// to so that GXT's own tracker stays consistent.
let _localUntrackDepth = 0;
export function untrack<T>(cb: () => T): T {
  _localUntrackDepth++;
  // A cache does not depend on what `cb` reads: the gxt cells `cb` reads go
  // to the frame outside the createCache frames, as they did before those
  // frames existed (a formula that reads a computed property still depends on
  // what its getter reads).
  const frame = _gxtGetTracker();
  const outside = _outsideCacheFrames(frame);
  if (outside !== frame) _gxtSetTracker(outside);
  try {
    return gxtUntrack(cb);
  } finally {
    if (outside !== frame) _gxtSetTracker(frame);
    _localUntrackDepth--;
  }
}

// Check if a tag OR a cache represents a constant value.
// Historical usage in this codebase treats both forms uniformly.
export function isConst(tag: any): boolean {
  if (tag === CONSTANT_TAG) return true;
  if (tag && typeof tag === 'object') {
    // Cache created by createCache() here: check whether fn() consumed any
    // tags and whether it has been evaluated at least once.
    if ((tag as any)._isCacheObj === true) {
      if ((tag as any)._initializedAtLeastOnce !== true) {
        throw new Error(
          'isConst() can only be used on a cache once getValue() has been called at least once'
        );
      }
      return (tag as any)._isCacheConst === true;
    }
    if (tag.isConst === true) return true;
    return false;
  }
  if (tag == null) return false;
  // Non-object, non-null primitives (e.g., 123) are invalid.
  throw new Error(
    `isConst() can only be used on an instance of a cache created with createCache(). Called with: ${String(tag)}`
  );
}

// Frame-based tracking - delegate to gxt
export function beginUntrackFrame() {
  gxtBeginUntrackFrame();
}

export function endUntrackFrame() {
  gxtEndUntrackFrame();
}

export function beginTrackFrame() {
  _manualTrackFrameStack.push(new Set());
  // Also keep gxt's frame stack in sync for any gxt callers.
  if (!_trackingTagStack) _trackingTagStack = [];
  _trackingTagStack.push(_manualTrackFrameStack[_manualTrackFrameStack.length - 1]!);
  try {
    gxtBeginTrackFrame();
  } catch {
    /* noop */
  }
}

export function endTrackFrame() {
  if (_manualTrackFrameStack.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }
  try {
    gxtEndTrackFrame();
  } catch {
    /* noop */
  }
  const consumed = _manualTrackFrameStack.pop()!;
  // Also pop from the tracking tag stack
  if (_trackingTagStack && _trackingTagStack.length > 0) _trackingTagStack.pop();
  if (_trackingTagStack && _trackingTagStack.length === 0) _trackingTagStack = null;
  // The frame's tag, as Glimmer's `Tracker.combine` makes it: CONSTANT_TAG
  // when the frame consumed no tag, the tag itself when it consumed one (any
  // number of times), else a "combined"-like tag that tracks only the tags
  // consumed within this frame, so validateTag only invalidates when one of
  // those tags changes — not on any global counter bump.
  consumed.delete(CONSTANT_TAG);
  if (consumed.size === 0) return CONSTANT_TAG;
  const deps = Array.from(consumed);
  if (deps.length === 1) return deps[0];
  const tag: any = { _isCombinedTag: true };
  Object.defineProperty(tag, 'value', {
    get() {
      return currentTagRevision(tag);
    },
  });
  combinedTagConstituents.set(tag, deps);
  return tag;
}

// Create a basic tag
// In classic @glimmer/validator, createTag() returns a DirtyableTag which is
// dirtyable but NOT updatable. We mark it accordingly so updateTag() can
// throw when invoked on a plain dirtyable tag. Internally it's the same
// cell-backed structure as createUpdatableTag so existing callers that call
// dirtyTag(createTag()) continue to work.
export function createTag() {
  const tag: any = createUpdatableTag();
  tag._isUpdatable = false;
  tag._isDirtyableOnly = true;
  // A `createTag()` dirtyable-only tag must NOT inherit the
  // `createUpdatableTag` coalesced-flush routing — `dirtyTag(createTag())` (e.g.
  // helper `recompute()` via the RECOMPUTE_TAG bridge) relies on the SYNCHRONOUS
  // `syncDomNow()` flush so the DOM is updated by the time `recompute()` returns.
  tag._isUpdatableCellTag = false;
  return tag;
}

// Mark a tag as dirty and flush DOM updates synchronously.
// This is needed because helper.recompute() calls dirtyTag() via join(),
// and tests expect the DOM to be updated synchronously after recompute().
export function dirtyTag(tag: any) {
  // Reject non-dirtyable tag types: CONSTANT_TAG (number), VOLATILE_TAG,
  // CURRENT_TAG, and any combined tag. Existing callers only pass tags
  // obtained from createTag() / createUpdatableTag() / tagFor() / etc., so
  // throwing here doesn't break downstream code.
  if (
    typeof tag === 'number' ||
    (tag &&
      typeof tag === 'object' &&
      (tag._isNonDirtyable === true || tag._isCombinedTag === true || tag._isVolatile === true))
  ) {
    throw new Error('Attempted to dirty a tag that was not dirtyable');
  }
  // Debug transaction: backtracking check. When inside a
  // runInTrackingTransaction frame and the tag was already consumed,
  // surface the Ember-style "You attempted to update `...`" assertion
  // that classic @glimmer/validator raises in DEV builds.
  if (_debugTransactionConsumed !== null && _debugTransactionConsumed.has(tag)) {
    const label = _debugTransactionLabelForTag?.get(tag);
    throw new Error(
      `Assertion Failed: You attempted to update \`${label}\` but it had already been used previously in the same computation`
    );
  }
  if (tag && typeof tag.dirty === 'function') {
    tag.dirty();
    // Bump global revision so track tags also detect this change
    globalRevisionCounter++;
    // Keep CURRENT_TAG's cell in sync so renderer/observer observing it
    // via valueForTag/validateTag see the bump.
    try {
      currentTagCell.value = globalRevisionCounter;
    } catch {
      /* noop */
    }
    _bumpClassicBridge();
    // Notify any scheduler registered via @glimmer/global-context
    try {
      const sr = (_glimmerGlobalContext as any).scheduleRevalidate;
      if (typeof sr === 'function') sr();
    } catch {
      /* noop */
    }
    // A plain `createUpdatableTag` (the tag backing a custom `cell()`, e.g.
    // `{{row.label.current}}` inside a keyed `{{#each}}`, and the storages of
    // the tracked collections: `trackedObject`, `trackedMap`, `trackedSet`, …)
    // is a state change for the run loop's DOM sync, as a `@tracked` write is,
    // plus ONE coalesced `_gxtSyncDom()` microtask
    // (`_scheduleNativeCollectionFlush`). The formulas that read the tag are
    // subscribed to its cell, and the sync re-runs exactly those. Recorded as
    // anything else, `syncDomNow()`'s non-property-driven branch CLEARS
    // `tagsToRevalidate`, discarding the just-dirtied cell + its subscribed
    // opcodes, when it runs before the microtask (the end of the run loop of
    // the write). Scoped to `_isUpdatableCellTag` (set only by
    // `createUpdatableTag`); `tagFor()` cells, `createTag()` dirtyable-only tags
    // (helper `recompute()`), and the classic-CP `@tracked` `dirtyTagFor` path
    // are all untouched and keep the synchronous `syncDomNow()` flush below.
    if (tag._isUpdatableCellTag === true) {
      _scheduleNativeCollectionFlush();
      return;
    }
    // Flush GXT DOM sync so the updated value is visible immediately (bridge
    // `syncDomNow`, i.e. compile.ts `_gxtSyncDomNow`).
    getGxtRenderer()?.compilePipeline.syncDomNow?.();
  }
}

// Debug utility for tags
export function debug(tag: any, label?: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Tag Debug${label ? `: ${label}` : ''}]`, tag);
  }
}

// Debug namespace for Glimmer VM compatibility
// runInTrackingTransaction tracks which tags have been consumed within the
// current debug transaction and throws if any of them are subsequently
// dirtied before the transaction completes. This mirrors the behavior of
// classic @glimmer/validator in DEV builds, surfacing read-then-write
// backtracking bugs.
let _debugTransactionConsumed: Set<any> | null = null;
let _debugTransactionLabelForTag: WeakMap<any, string> | null = null;
export function runInTrackingTransaction<T>(fn: () => T, debuggingContext?: string): T {
  const prevConsumed = _debugTransactionConsumed;
  const prevLabels = _debugTransactionLabelForTag;
  _debugTransactionConsumed = new Set<any>();
  _debugTransactionLabelForTag = new WeakMap<any, string>();
  try {
    return fn();
  } finally {
    _debugTransactionConsumed = prevConsumed;
    _debugTransactionLabelForTag = prevLabels;
  }
}

// Export as namespace-like object for imports like: import * as debug from '@glimmer/validator'
// Some code imports { runInTrackingTransaction } from '@glimmer/validator'
debug.runInTrackingTransaction = runInTrackingTransaction;

// --- Reactive-collection flush hook --------------------------------------
//
// The tag-based tracked collections (trackedArray/Map/Set/WeakMap/WeakSet/
// Object) themselves are test-only and live in `./validator-vm-compat`. The
// coalesced DOM-sync flush below stays here because the RUNTIME `dirtyTag`
// (the `_isUpdatableCellTag` branch) also routes through it; it is `export`ed
// so the moved collections can call it.

// Coalesced DOM-sync flush for reactive-collection structural mutations.
// A single `push(...thousand)` / `splice` fires the collection's `set` trap
// many times; it must not re-render per element. Each `dirtyCollection`
// schedules one GXT `syncDom()` via a microtask (deduped by
// `_collectionFlushScheduled`), which runs after the synchronous mutation
// method returns. GXT's own auto-scheduler is suppressed by the gxt-backend's
// `__gxtExternalSchedule` hook (it only sets a pending flag — `compile.ts`),
// so a GXT cell write (`collection.dirty()`) enqueues the dependent opcode but
// nothing flushes it; this microtask is the flush point. `syncDom()` (not
// `flushCellOpcodes`, which only registers opcode/destructor pools) processes
// the dirty-opcode queue, re-running the subscribed list opcode →
// `syncList(newArray)` → keyed diff (move/insert/remove by key, reusing row
// instances). Only the dirtied list opcode re-runs; there is no whole-root
// re-render, so the host template's `this` context is untouched.
let _collectionFlushScheduled = false;
export function _scheduleCollectionFlush(): void {
  if (_collectionFlushScheduled) return;
  _collectionFlushScheduled = true;
  queueMicrotask(() => {
    _collectionFlushScheduled = false;
    try {
      _gxtSyncDom();
    } catch {
      /* best-effort */
    }
  });
}

// A change of a collection whose native GXT cell the formulas that read it
// subscribe to directly (trackedArray's `collection` tag,
// `createUpdatableTagNative`). Besides the coalesced flush above, the change
// is recorded as a pending state change and a revalidation is scheduled, so the
// runloop's DOM sync renders it (Glimmer: dirtying a tag schedules a
// revalidation, rendered when the current runloop ends). `_gxtSyncDomNow`
// runs gxt's `syncDom()` only for a sync recorded as a property change; any
// other sync discards gxt's pending invalidations as initial-render noise.
// Without the record, a sync that ran before the flush microtask (a
// `runTask` / `rerender()` ending, a sync something else in the same runloop
// asked for) dropped the collection cell's invalidation, and every formula
// that read the collection — a helper over a `trackedArray` argument,
// `{{this.list.length}}` — kept its old value. While a render is in progress
// only the pending sync is recorded: the formulas that render after the change
// read the changed collection.
export function _scheduleNativeCollectionFlush(): void {
  const pipeline = getGxtRenderer()?.compilePipeline;
  pipeline?.setPendingSync?.(true);
  if (!pipeline?.isCurrentlyRendering?.()) {
    pipeline?.setPendingSyncFromPropertyChange?.(true);
  }
  const scheduleRevalidate = (_glimmerGlobalContext as any).scheduleRevalidate;
  if (typeof scheduleRevalidate === 'function') scheduleRevalidate();
  _scheduleCollectionFlush();
}

// Raw lib-level aliases for upstream's vendored @glimmer/* deep-path imports.
// Upstream migrated the vendored @glimmer packages to import the un-renamed
// names directly from `@glimmer/validator/lib/validators` (e.g.
// `import { UPDATE_TAG as updateTag }`), whereas `@glimmer/validator/index.ts`
// re-exports them renamed (`UPDATE_TAG as updateTag`, `DIRTY_TAG as dirtyTag`).
// The GXT vite alias collapses those deep paths onto this single shim so the
// whole graph shares ONE reactive tag system, so this shim must expose both the
// renamed (index) spelling AND the raw lib spelling of the same binding.
export { updateTag as UPDATE_TAG, dirtyTag as DIRTY_TAG };

// Standalone reactive values (`tracked(value)`, `@glimmer/validator`'s
// `trackedValue`): upstream's packages/@glimmer/validator/lib/tracked-value.ts
// on this shim's tag primitives (`consumeTag`, `createUpdatableTag`,
// `dirtyTag`). The class is upstream's; it lives in this module rather than its
// own because the rollup build forbids the import cycle a separate module that
// imports the primitives back from here would form.
interface ReactiveOptions<Value> {
  equals: (a: Value, b: Value) => boolean;
  description: string | undefined;
}

/**
 * A mutable reactive value.
 *
 * Reading `value` consumes the underlying tag (entangling with any active
 * tracking frame), and writing `value` dirties it.
 */
export interface Reactive<Value> {
  value: Value;
}

/**
 * A reactive value that can only be read.
 */
export interface ReadOnlyReactive<Value> extends Reactive<Value> {
  readonly value: Value;
}

export class TrackedValue<Value = unknown> implements Reactive<Value> {
  #isFrozen = false;
  #value: Value;
  readonly #options: ReactiveOptions<Value>;
  readonly #tag: ReturnType<typeof createUpdatableTag>;

  /**
   * `get`, `set`, `update` and `freeze` are bound to the instance,
   * so that they can be detached from it.
   *
   * Each one is made the first time that it is read,
   * so an instance that only uses `value` makes no function.
   *
   * Each one can be assigned, for example by a test that replaces it.
   */
  #get: (() => Value) | undefined;
  #set: ((value: Value) => boolean) | undefined;
  #update: ((updater: (value: Value) => Value) => void) | undefined;
  #freeze: (() => void) | undefined;

  constructor(value: Value, options: ReactiveOptions<Value>) {
    /**
     * If we let V8 try to completely optimize TrackedValue for
     *   for each type of `value`,
     *     that performs worse than making V8 only use one internal
     *     internal version of the class for each type of `value`.
     *
     * The first value of another kind makes V8 throw away
     *   the optimized code that reads the field.
     *
     * The field starts as `undefined`,
     *   so a number here makes it general from the first instance.
     */
    this.#value = 0 as Value;
    this.#value = value;
    this.#options = options;
    this.#tag = createUpdatableTag();
  }

  /**
   * The underlying value.
   *
   * Reading entangles with the current tracking frame, and writing notifies
   * consumers (unless the configured `equals` deems the new value equal to
   * the current one).
   */
  get value(): Value {
    consumeTag(this.#tag);

    return this.#value;
  }

  set value(value: Value) {
    let set = this.#set;

    if (set === undefined) {
      this.#write(value);
    } else {
      set(value);
    }
  }

  /**
   * Function short-hand for reading `value`.
   */
  get get(): () => Value {
    return (this.#get ??= () => this.value);
  }

  /**
   * Function short-hand for assigning `value`.
   *
   * Returns `true` if the value changed (and consumers were notified),
   * `false` if the new value was equal to the current one.
   */
  get set(): (value: Value) => boolean {
    return (this.#set ??= (value) => this.#write(value));
  }

  /**
   * Update the value based on the current value, without consuming it.
   */
  get update(): (updater: (value: Value) => Value) => void {
    return (this.#update ??= (updater) => {
      this.#write(updater(this.#value));
    });
  }

  /**
   * Prevents further updates, making the TrackedValue behave as a
   * ReadOnlyReactive.
   */
  get freeze(): () => void {
    return (this.#freeze ??= () => {
      this.#isFrozen = true;
    });
  }

  #write(value: Value): boolean {
    if (this.#isFrozen) {
      throw new Error(
        `Cannot update a frozen TrackedValue${
          this.#options.description ? ` (\`${this.#options.description}\`)` : ''
        }`
      );
    }

    if (this.#options.equals(this.#value, value)) {
      return false;
    }

    this.#value = value;

    dirtyTag(this.#tag);

    return true;
  }
}

const DEFAULT_OPTIONS: ReactiveOptions<unknown> = Object.freeze({
  equals: Object.is,
  description: undefined,
});

export function trackedValue<Value>(
  value: Value,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): TrackedValue<Value> {
  if (options === undefined) {
    return new TrackedValue(value, DEFAULT_OPTIONS);
  }

  return new TrackedValue(value, {
    equals: options.equals ?? Object.is,
    description: options.description,
  });
}
