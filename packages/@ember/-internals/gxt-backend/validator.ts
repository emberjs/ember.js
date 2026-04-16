// Import from glimmer-compatibility to avoid gxt compiler conflicts
import { validator, caching, storage } from '@lifeart/gxt/glimmer-compatibility';
// Global context module — imported as namespace so we pick up the live
// `scheduleRevalidate` binding (which testOverrideGlobalContext reassigns
// at runtime).
import * as _glimmerGlobalContext from '@glimmer/global-context';
// Direct import of GXT's native cell primitive (NOT via storage wrapper) so we
// can bridge classic @glimmer/validator tag mutations into GXT's effect system.
// Using the same cell factory that _gxtEffect tracks ensures reads inside an
// effect register a subscription that will re-fire the effect on updates.
import { cell as _gxtNativeCell } from '@lifeart/gxt';

// Create cell-like functionality using storage primitives
const createCell = (initialValue: any, name?: string) => {
  const s = storage.createStorage(initialValue, Object.is);
  return {
    get value() { return storage.getValue(s); },
    set value(v: any) { storage.setValue(s, v); },
  };
};
const cell = createCell;

// trackedObjectCell: a native GXT cell (not a storage-wrapped cell). Used by
// trackedObject so property reads/writes register with GXT's effect tracker
// the same way @lifeart/gxt's own cell() does. The storage-wrapped cell above
// goes through an older compatibility shim that does not always plug into
// GXT's effect tracking, which broke trackedObject reactivity through the
// renderComponent args-proxy path.
const createTrackedObjectCell = (initialValue: any, name?: string) => {
  const c = _gxtNativeCell(initialValue, name || 'trackedObject');
  return {
    get value() { return c.value; },
    set value(v: any) { c.update(v); },
  };
};

// Create formula using cache
const formula = <T>(fn: () => T, name?: string) => {
  const cache = caching.createCache(fn);
  return {
    get value() { return caching.getValue(cache); },
  };
};

// Re-export most validator functions directly
export const {
  tagFor: gxtTagFor,
  isTracking: gxtIsTracking,
  tagMetaFor,
  track: gxtTrack,
  // trackedData - we provide our own implementation below to avoid infinite loops
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
// Strategy: We run the callback and capture which GXT cells were read by
// temporarily hooking into GXT's cell tracking system. We return a tag
// that knows about these cells and can detect when they change by
// re-running the callback and comparing results.
let _trackingTagStack: Set<any>[] | null = null;

// A monotonic counter for tag revisions in the track/validateTag system.
let _trackRevision = 0;

export function track(cb: () => void): any {
  // Entering an explicit tracking frame: temporarily clear the local
  // untrack depth so that inner consumeTag calls register and nested
  // isTracking() reports truthy even if we're logically inside an
  // outer untrack(). The depth is restored on exit.
  const savedUntrackDepth = _localUntrackDepth;
  _localUntrackDepth = 0;
  // Push a new set to collect consumed tags (from explicit consumeTag calls)
  if (!_trackingTagStack) _trackingTagStack = [];
  const consumed = new Set<any>();
  _trackingTagStack.push(consumed);

  // Run the callback. The tracked getters read GXT cells, establishing
  // dependencies. We can't easily capture those cells, but we CAN detect
  // changes by re-running the callback later and checking if any tracked
  // values changed.
  //
  // We store the callback itself, plus a snapshot of tracked values via
  // a version counter. Each time a tracked cell is dirtied (via our
  // dirtyTagFor), we bump a global revision. We compare the revision at
  // snapshot time vs current to detect changes.
  const revisionBefore = globalRevisionCounter;

  gxtBeginTrackFrame();
  try {
    cb();
  } finally {
    gxtEndTrackFrame();
    _trackingTagStack.pop();
    if (_trackingTagStack.length === 0) _trackingTagStack = null;
    _localUntrackDepth = savedUntrackDepth;
  }

  // If no specific tags were consumed, return a track-tag that uses the
  // global revision counter (broad invalidation) — matches existing
  // semantics relied on by autoComputed / alias chain tags.
  const consumedArr = Array.from(consumed);
  if (consumed.size === 0) {
    const tag: any = {
      _isTrackTag: true,
      _consumed: consumedArr,
      get value() { return globalRevisionCounter; },
    };
    return tag;
  }

  // Otherwise, return a combined tag scoped to the specific consumed
  // tags. This ensures that dirties of unrelated (especially untracked)
  // tags don't invalidate a frame that didn't actually read them.
  const tag: any = { _isCombinedTag: true, _consumed: consumedArr };
  Object.defineProperty(tag, 'value', {
    get() { return currentTagRevision(tag); },
  });
  combinedTagConstituents.set(tag, consumedArr);
  return tag;
}

// Custom isTracking that also returns true when inside our custom track()
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
// so we can observe our frame boundaries without depending on gxt internals.
const _manualTrackFrameStack: Set<any>[] = [];

// Wrap tagFor to handle Symbol keys properly
// GXT's tagFor might try to convert the key to a string for debugging
export function tagFor(obj: object, key?: string | symbol, meta?: any) {
  try {
    // Convert symbol keys to their description or a string representation
    const safeKey = typeof key === 'symbol' ? (key.description || String(key)) : key;
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
    return gxtTagFor(obj, safeKey, meta);
  } catch (err: any) {
    if (err?.message?.includes('Symbol') || err?.message?.includes('name') || err?.message?.includes('undefined')) {
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
// 3. The global revision counter has changed (for GXT cell reads we can't
//    intercept) AND fn() produces a different result (deep equality check
//    not feasible, so we use a per-cache revision system)
//
// For correctness with the "constant helper" test: if a cache's fn() doesn't
// consume any tags or nested caches, it's treated as constant and never
// re-evaluated.

const _cacheEvalStack: Set<any>[] = [];

export function createCache<T>(fn: () => T): { value: T; destroy?: () => void; tag?: any } {
  if (typeof fn !== 'function') {
    throw new Error(
      `createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
    );
  }
  let _initialized = false;
  let _lastValue: T;
  // Our own revision (bumped when our value actually changes)
  let _revision = 0;
  // Tags consumed via consumeTag during fn()
  let _consumedTags: any[] = [];
  let _consumedTagSnapshots: any[] = [];
  // Nested caches read during fn() and their revisions at that time
  let _nestedCaches: any[] = [];
  let _nestedCacheRevisions: number[] = [];

  const cacheObj: any = {
    _isCacheObj: true,
    _revision: 0,
    _initializedAtLeastOnce: false,
    _isCacheConst: false,

    get value(): T {
      if (!_isValid()) {
        const wasInitialized = _initialized;
        const oldValue = _lastValue;
        _lastValue = _evaluate();
        _initialized = true;
        cacheObj._initializedAtLeastOnce = true;
        // A cache is const if its fn() consumed no tags and depended on
        // no nested caches during evaluation.
        cacheObj._isCacheConst =
          _consumedTags.length === 0 && _nestedCaches.length === 0;
        // Bump our revision if the value changed (or first eval)
        if (!wasInitialized || oldValue !== _lastValue) {
          _revision++;
          cacheObj._revision = _revision;
        }
      }
      // Register in parent cache's eval stack so it knows we're a dependency
      if (_cacheEvalStack.length > 0) {
        _cacheEvalStack[_cacheEvalStack.length - 1]!.add(cacheObj);
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
        if (gxtTracking || cacheTrackingActive) {
          for (let i = 0; i < _consumedTags.length; i++) {
            const tag = _consumedTags[i];
            if (tag == null) continue;
            try {
              // consumeTag() pushes into the top cache-tag tracker AND also
              // forwards to gxt's validator.consumeTag() for the gxt frame.
              consumeTag(tag);
            } catch { /* noop */ }
          }
        }
      }
      return _lastValue;
    },
    destroy() {
      _consumedTags = [];
      _nestedCaches = [];
    },
    get tag() {
      return formula(fn, 'createCache');
    },
  };

  function _evaluate(): T {
    const consumed = new Set<any>();
    const nested = new Set<any>();
    _cacheTagTracker.push(consumed);
    _cacheEvalStack.push(nested);
    try {
      return fn();
    } finally {
      _cacheEvalStack.pop();
      _cacheTagTracker.pop();
      // Store consumed tags and snapshots. We snapshot using
      // currentTagRevision() rather than tag.value. For GXT tagFor tags,
      // tag.value returns the underlying cell value (e.g. the number 4),
      // not a revision counter, and that cell value isn't bumped by our
      // dirtyTagFor path — it's only updated if the mutation goes through
      // GXT's own trackedData.setter. Our compat trackedData stores values
      // in a separate map and only calls gxtDirtyTagFor + markTagDirty. So
      // we use our own dirty-revision bookkeeping as the source of truth
      // for cache invalidation.
      _consumedTags = Array.from(consumed);
      _consumedTagSnapshots = _consumedTags.map(t => {
        try { return currentTagRevision(t); } catch { return 0; }
      });
      // Store nested caches
      _nestedCaches = Array.from(nested);
      _nestedCacheRevisions = _nestedCaches.map(c => c._revision || 0);
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

// Custom trackedData implementation that avoids infinite loops
// The GXT version creates a formula that reads obj[key], which triggers the
// tracked getter again. Our version uses internal WeakMap storage instead.
const trackedDataStorage = new WeakMap<object, Map<string | symbol, ReturnType<typeof createCell>>>();

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

export function isInBacktrackingFrame() {
  return _backtrackingFrame !== null;
}

// Expose on globalThis for ember-gxt-wrappers.ts (avoids circular imports)
(globalThis as any).__gxtBeginBacktrackingFrame = beginBacktrackingFrame;
(globalThis as any).__gxtEndBacktrackingFrame = endBacktrackingFrame;

// Expose classic tag primitives for gxt-backend/manager.ts so component-arg
// own-property getters can participate in createCache/invokeHelper tag tracking.
(globalThis as any).__classicConsumeTag = (tag: any) => consumeTag(tag);
(globalThis as any).__classicTagFor = (obj: any, key: any) => tagFor(obj, key);
(globalThis as any).__classicDirtyTagFor = (obj: any, key: any) => dirtyTagFor(obj, key);

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

      // Record this read in the backtracking frame
      if (_backtrackingFrame !== null) {
        _backtrackingFrame.set(cellForKey, { key, obj });
      }
      // Debug tracking transaction: record the cell as consumed so a
      // subsequent setter call in the same transaction can detect the
      // backtracking update.
      if (_debugTransactionConsumed !== null) {
        _debugTransactionConsumed.add(cellForKey);
        _debugTransactionLabelForTag?.set(
          cellForKey,
          `${String(key)}\` on \`${(obj as any)?.constructor?.name || 'Object'}`
        );
      }

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
        // Backtracking detection: if this cell was read in the current frame,
        // setting it is backtracking
        if (_backtrackingFrame !== null && _backtrackingFrame.has(cellForKey)) {
          const info = _backtrackingFrame.get(cellForKey)!;
          // Try to get a useful name: class name, toString, or fallback
          const rawObj = info.obj as any;
          const objName = rawObj?.constructor?.name && rawObj.constructor.name !== 'Object'
            ? rawObj.constructor.name
            : (rawObj?.toString?.() !== '[object Object]' ? rawObj?.toString?.() : '<unknown>');
          // Clear the frame before calling assert to prevent recursion
          _backtrackingFrame = null;
          const renderTree = _backtrackingDebugName
            ? `(result of a \`${_backtrackingDebugName}\` helper)`
            : '(unknown)';
          const msg = `You attempted to update \`${String(info.key)}\` on \`${objName}\`, but it had already been used previously in the same computation. Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.\n\n\`${String(info.key)}\` was first used:\n\n- While rendering:\n  -top-level\n    ${renderTree}\n\nStack trace for the update:`;
          // Use the Ember assert function directly. The __emberAssertDirect
          // is a live reference to the assert from @ember/debug, which
          // is updated when expectAssertion stubs it via setDebugFunction.
          const assertDirect = (globalThis as any).__emberAssertDirect;
          if (typeof assertDirect === 'function') {
            assertDirect(msg, false);
          }
        }
        // Debug tracking transaction: if this cell was read earlier in
        // the current runInTrackingTransaction frame, throw an Ember-style
        // assertion matching classic @glimmer/validator behavior.
        if (
          _debugTransactionConsumed !== null &&
          _debugTransactionConsumed.has(cellForKey)
        ) {
          const label = _debugTransactionLabelForTag?.get(cellForKey);
          throw new Error(
            `Assertion Failed: You attempted to update \`${label}\` but it had already been used previously in the same computation`
          );
        }
        cellForKey.value = value;
      }
      // Also bump the global revision counter so track() tags that
      // depend on this cell via a cell read (no explicit consumeTag)
      // invalidate on mutation. Real Ember tracked decorators route
      // through dirtyTagFor which handles this — this covers the
      // test-only path that uses trackedData() directly.
      globalRevisionCounter++;
      try { currentTagCell.value = globalRevisionCounter; } catch { /* noop */ }
    }
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
export const CLASSIC_TAG_BRIDGE = _classicBridgeCell;
let _classicBridgeCounter = 0;
function _bumpClassicBridge() {
  _classicBridgeCounter++;
  try { _classicBridgeCell.update(_classicBridgeCounter); } catch { /* noop */ }
}
// Touch from inside an effect to subscribe: read .value.
// Export a helper so manager.ts can call it without caring about Cell shape.
export function touchClassicBridge(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    _classicBridgeCell.value;
  } catch { /* noop */ }
}

// Side-channel registry for effects that must re-fire on ANY classic tag
// mutation. Used as a fallback for rendering paths where GXT's effect
// scheduler doesn't pick up the classic-bridge cell dirty (e.g., when the
// effect is created outside an active render/sync cycle). Callbacks are
// invoked synchronously at the end of dirtyTagFor after the classic tag
// has been updated but before the runloop flush. Registrants are expected
// to be idempotent and cheap.
const _classicReactors = new Set<() => void>();
export function registerClassicReactor(cb: () => void): () => void {
  _classicReactors.add(cb);
  return () => { _classicReactors.delete(cb); };
}
function _fireClassicReactors() {
  if (_classicReactors.size === 0) return;
  // Copy to avoid mutation during iteration
  const snapshot = Array.from(_classicReactors);
  for (const cb of snapshot) {
    try { cb(); } catch { /* ignore individual reactor errors */ }
  }
}

// Wrap dirtyTagFor to also bump the global revision AND mark the specific tag as dirty
const gxtDirtyTagFor = validator.dirtyTagFor;

export function dirtyTagFor(obj: any, key: any) {
  // Convert Symbol keys to safe string representation
  const safeKey = typeof key === 'symbol' ? (key.description || String(key)) : key;

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

  // Mark GXT sync as pending so __gxtSyncDomNow processes the force-rerender.
  // Without this, set() on components dirtied Glimmer tags but __gxtPendingSync
  // stayed false, causing __gxtSyncDomNow to be a no-op.
  const schedule = (globalThis as any).__gxtExternalSchedule;
  if (typeof schedule === 'function') {
    schedule();
  }

  // Notify the scheduler (typically _backburner.ensureInstance()) so that the
  // backburner run loop drains and flushAsyncObservers fires. Without this,
  // @tracked setter → dirtyTagFor outside an explicit run() never starts a
  // run loop, so async observers watching dependentKeyCompat getters never
  // get flushed.
  try {
    const sr = (_glimmerGlobalContext as any).scheduleRevalidate;
    if (typeof sr === 'function') sr();
  } catch { /* noop */ }

  // Then call the original dirtyTagFor with the safe key
  let result: any;
  try {
    // Ensure obj has a constructor for GXT's debug label
    if (obj && typeof obj === 'object' && !obj.constructor) {
      Object.defineProperty(obj, 'constructor', {
        value: Object, writable: true, configurable: true, enumerable: false,
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
  _fireClassicReactors();
  // Helper autotracking fallback: for every cached helper bucket produced
  // by ember-gxt-wrappers.ts, invalidate its cached arg-serialization so
  // that the next time the enclosing GXT formula re-enters $_maybeHelper
  // it takes the cache-miss branch and calls delegate.getValue with fresh
  // state. This covers helpers that close over non-argument @tracked
  // state (e.g. functional helpers reading `service.name`, class-based
  // helpers reading a module-level tracked instance) — those reads don't
  // participate in the argsSer cache key.
  //
  // Note: we do NOT re-run delegate.getValue here, because
  //   (a) it would double-count user-visible compute() invocations, and
  //   (b) dirtyTagFor can fire multiple times during one logical mutation.
  // The natural cell-propagation path (the tracked setter writes the
  // underlying cell via trackedData) handles re-rendering. Our job here
  // is only to make sure the cache doesn't serve stale data to that
  // re-render.
  try {
    const helperCache = (globalThis as any).__gxtClassHelperInstanceCache as
      | Map<string, any>
      | undefined;
    if (helperCache && helperCache.size > 0) {
      for (const [, cached] of helperCache) {
        if (!cached || cached.__managerBucket !== true) continue;
        cached.lastArgsSer = '__classic_tag_dirty__' + globalRevisionCounter;
      }
    }
  } catch { /* noop */ }
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

// A volatile tag that always needs recomputation.
// Marked with _isVolatile so validateTag can detect it and report as invalid.
export const VOLATILE_TAG: any = {
  _isVolatile: true,
  _isNonDirtyable: true,
  _isNonUpdatable: true,
  get value() { return Date.now() + Math.random(); },
};

// Revision counter for tag invalidation
let $REVISION = 1;

// Bump the global revision counter
export function bump() {
  $REVISION++;
  return $REVISION;
}

// Allow cycles in tag dependencies - WeakMap to track which tags allow cycles
export const ALLOW_CYCLES = new WeakMap<object, boolean>();

// Track combined tags and their constituents
const combinedTagConstituents = new WeakMap<object, any[]>();

// Track updatable tag dependencies (for updateTag)
const updatableTagDependencies = new WeakMap<object, any[]>();

// Combine multiple tags into a single computed tag.
//
// We intentionally do NOT wrap this in a GXT `formula(...)`: that would
// eagerly read each constituent tag's `.value` at combine-time. For cells
// installed by `cellFor` on classic CP-backed properties, reading `.value`
// invokes the user's getter (the cell's fn wraps the classic CP getter),
// which is a forbidden side effect — classic Ember must be able to combine
// dependency tags without running any CP user code. Instead we return a
// plain marker object and rely on `currentTagRevision()` to walk the
// registered constituents lazily when `validateTag`/`valueForTag` is asked.
export function combine(tags: any[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return CONSTANT_TAG;
  }
  const combinedTag: any = { _isCombinedTag: true };
  Object.defineProperty(combinedTag, 'value', {
    get() { return currentTagRevision(combinedTag); },
  });
  combinedTagConstituents.set(combinedTag, tags);
  return combinedTag;
}

// Track tag revisions for proper validation.
// We use globalRevisionCounter as the single source of truth for all revisions.
// This ensures track tags, dirty tags, and snapshot revisions are all comparable.
const tagLastSnapshotRevision = new WeakMap<object, number>();

// Track dirty revisions - when a tag was last dirtied (in globalRevisionCounter space)
const tagDirtyRevision = new WeakMap<object, number>();

// Get the revision for a tag (for storing as lastRevision).
// Uses globalRevisionCounter so all revisions are in the same space.
function getTagSnapshotRevision(tag: any): number {
  if (!tagLastSnapshotRevision.has(tag)) {
    // Don't bump the counter here - just use the current value.
    // Bumping would cause false invalidations for track tags.
    tagLastSnapshotRevision.set(tag, globalRevisionCounter);
  }
  return tagLastSnapshotRevision.get(tag)!;
}

// Mark a tag as dirtied at the current revision (uses globalRevisionCounter)
function markTagDirty(tag: any): void {
  // globalRevisionCounter was already bumped by dirtyTagFor before calling us
  const rev = globalRevisionCounter;
  tagDirtyRevision.set(tag, rev);
  tagLastSnapshotRevision.set(tag, rev);
}

// Compute the current "revision" for a tag by taking the max of its own
// dirty revision and all its dependencies' revisions. This mirrors how
// Glimmer VM's tag.value works: it returns the max revision across the
// entire dependency tree, so any mutation anywhere increases the value.
function currentTagRevision(tag: any, visited = new Set<any>(), stack?: Set<any>): number {
  if (!tag || typeof tag !== 'object') return 0;
  // Cycle detection: `stack` tracks the active recursion path. If the tag
  // is already on the stack, we found a true cycle. Unless ALLOW_CYCLES
  // permits it, throw — matching classic @glimmer/validator behavior.
  // Real callers never form tag cycles, so this only fires in tests.
  if (stack && stack.has(tag)) {
    if (ALLOW_CYCLES.get(tag) === true) {
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

    // Track tags: their "revision" is the globalRevisionCounter at the time
    // they were snapshot. After any mutation (which bumps globalRevisionCounter),
    // the current revision becomes the new globalRevisionCounter.
    if (tag._isTrackTag) {
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
    const deps = updatableTagDependencies.get(tag);
    if (deps) {
      const bufferRev = tag._subBufferRevision;
      for (const d of deps) {
        const r = currentTagRevision(d, visited, activeStack);
        // Buffered update: any dependency revision up to and including
        // the buffer value is masked. Only strictly newer revisions break
        // the buffer.
        if (typeof bufferRev === 'number' && r <= bufferRev) {
          continue;
        }
        if (r > max) max = r;
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

// Update the revision snapshot for a tag (called after observer fires)
export function updateTagRevision(tag: any): number {
  // Use the current globalRevisionCounter - don't bump it since no actual mutation happened
  tagLastSnapshotRevision.set(tag, globalRevisionCounter);
  return globalRevisionCounter;
}

// Reset tracking state (used in testing)
let trackingStack: any[] = [];

export function resetTracking() {
  trackingStack = [];
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
    (outer && typeof outer === 'object' &&
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
  // again AFTER the update call.
  //
  // We only apply buffering to tags explicitly flagged _isUpdatable so
  // this doesn't alter invalidation semantics for tagFor-based property
  // tags used by alias.ts / computed.ts.
  if (outer && typeof outer === 'object' && outer._isUpdatable === true) {
    outer._subBufferRevision = currentTagRevision(inner);
    outer._subBufferedAt = globalRevisionCounter;
  }

  // If the outer tag has an update method, call it
  if (typeof outer.update === 'function') {
    outer.update(inner);
  }

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
// frame, and isTracking() reports false. We still delegate to GXT's
// untrack so that GXT's own tracker stays consistent.
let _localUntrackDepth = 0;
export function untrack<T>(cb: () => T): T {
  _localUntrackDepth++;
  try {
    return gxtUntrack(cb);
  } finally {
    _localUntrackDepth--;
  }
}

// Check if a tag OR a cache represents a constant value.
// Historical usage in this codebase treats both forms uniformly.
export function isConst(tag: any): boolean {
  if (tag === CONSTANT_TAG) return true;
  if (tag && typeof tag === 'object') {
    // Cache created by our createCache(): check whether fn() consumed any
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
  try { gxtBeginTrackFrame(); } catch { /* noop */ }
}

export function endTrackFrame() {
  if (_manualTrackFrameStack.length === 0) {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }
  try { gxtEndTrackFrame(); } catch { /* noop */ }
  const consumed = _manualTrackFrameStack.pop()!;
  // Also pop from the tracking tag stack
  if (_trackingTagStack && _trackingTagStack.length > 0) _trackingTagStack.pop();
  if (_trackingTagStack && _trackingTagStack.length === 0) _trackingTagStack = null;
  // Return a "combined"-like tag that tracks only the specific tags that
  // were consumed within this frame, so validateTag only invalidates when
  // one of those tags changes — not on any global counter bump.
  const deps = Array.from(consumed);
  const tag: any = { _isCombinedTag: true };
  Object.defineProperty(tag, 'value', {
    get() { return currentTagRevision(tag); },
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
    (tag && typeof tag === 'object' &&
      (tag._isNonDirtyable === true ||
        tag._isCombinedTag === true ||
        tag._isVolatile === true))
  ) {
    throw new Error('Attempted to dirty a tag that was not dirtyable');
  }
  // Debug transaction: backtracking check. If we're inside a
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
    try { currentTagCell.value = globalRevisionCounter; } catch { /* noop */ }
    _bumpClassicBridge();
    // Notify any scheduler registered via @glimmer/global-context
    try {
      const sr = (_glimmerGlobalContext as any).scheduleRevalidate;
      if (typeof sr === 'function') sr();
    } catch { /* noop */ }
    // Flush GXT DOM sync so the updated value is visible immediately
    const syncNow = (globalThis as any).__gxtSyncDomNow;
    if (typeof syncNow === 'function') {
      syncNow();
    }
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

// Create a tracked map - wraps a Map to make its operations reactive
export function trackedMap<K, V>(entries?: Iterable<[K, V]> | null): Map<K, V> {
  const map = new Map(entries || undefined);
  const tag = cell(0, 'trackedMap');
  if (!map) {
    return new Map() as Map<K, V>;
  }

  return new Proxy(map, {
    get(target, prop, receiver) {
      if (prop === 'size') {
        tag.value;
        return target.size;
      }
      const value = target[prop as keyof Map<K, V>];
      if (typeof value === 'function') {
        return function (...args: any[]) {
          if (['get', 'has', 'keys', 'values', 'entries', 'forEach', Symbol.iterator].includes(prop as any)) {
            tag.value; // track read
          }
          const result = (value as Function).apply(target, args);
          if (['set', 'delete', 'clear'].includes(prop as string)) {
            tag.value = Date.now(); // trigger update
          }
          return result;
        };
      }
      return value;
    },
  }) as Map<K, V>;
}

// Create a tracked set - wraps a Set to make its operations reactive
export function trackedSet<T>(values?: Iterable<T> | null): Set<T> {
  const set = new Set(values);
  const tag = cell(0, 'trackedSet');

  return new Proxy(set, {
    get(target, prop, receiver) {
      if (prop === 'size') {
        tag.value;
        return target.size;
      }
      const value = target[prop as keyof Set<T>];
      if (typeof value === 'function') {
        return function (...args: any[]) {
          if (['has', 'keys', 'values', 'entries', 'forEach', Symbol.iterator].includes(prop as any)) {
            tag.value; // track read
          }
          const result = (value as Function).apply(target, args);
          if (['add', 'delete', 'clear'].includes(prop as string)) {
            tag.value = Date.now(); // trigger update
          }
          return result;
        };
      }
      return value;
    },
  }) as Set<T>;
}

// Create a tracked WeakMap
export function trackedWeakMap<K extends object, V>(entries?: Iterable<[K, V]> | null): WeakMap<K, V> {
  const map = new WeakMap(entries as any);
  // WeakMaps don't need reactivity in the same way since they can't be iterated
  return map;
}

// Create a tracked WeakSet
export function trackedWeakSet<T extends object>(values?: Iterable<T> | null): WeakSet<T> {
  const set = new WeakSet(values as any);
  // WeakSets don't need reactivity in the same way since they can't be iterated
  return set;
}

// Create a tracked array - wraps an array to make its operations reactive
export function trackedArray<T>(arr: T[] = []): T[] {
  if (!Array.isArray(arr)) {
    arr = [];
  }
  const items = cell(arr, 'trackedArray');

  return new Proxy(arr, {
    get(target, prop, receiver) {
      if (prop === 'length') {
        // Access the cell to track
        items.value;
        return target.length;
      }
      if (typeof prop === 'string' && !isNaN(Number(prop))) {
        items.value;
        return target[Number(prop)];
      }
      const value = target[prop as keyof T[]];
      if (typeof value === 'function') {
        return function (...args: any[]) {
          const result = (value as Function).apply(target, args);
          // Mutating methods should trigger reactivity
          if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].includes(prop as string)) {
            items.value = [...target];
          }
          return result;
        };
      }
      return value;
    },
    set(target, prop, value, receiver) {
      target[prop as keyof T[]] = value;
      items.value = [...target];
      return true;
    },
  });
}

// Create a tracked object - wraps an object to make all its properties reactive
export function trackedObject<T extends object>(obj?: T): T {
  if (!obj || typeof obj !== 'object') {
    obj = {} as T;
  }
  const values = new Map<string | symbol, any>();
  const tags = new Map<string | symbol, ReturnType<typeof createTrackedObjectCell>>();

  return new Proxy(obj, {
    get(target, prop, receiver) {
      // Consume the tag for this property
      let tag = tags.get(prop);
      if (!tag) {
        tag = createTrackedObjectCell(target[prop as keyof T], `trackedObject.${String(prop)}`);
        tags.set(prop, tag);
        values.set(prop, target[prop as keyof T]);
      }
      return tag.value;
    },
    set(target, prop, value, receiver) {
      let tag = tags.get(prop);
      if (!tag) {
        tag = createTrackedObjectCell(value, `trackedObject.${String(prop)}`);
        tags.set(prop, tag);
      } else {
        tag.value = value;
      }
      values.set(prop, value);
      target[prop as keyof T] = value;
      // Route the mutation through the full dirtyTagFor pipeline so GXT's
      // effect scheduler, the classic-tag bridge, and registered classic
      // reactors all see the change. The storage-backed cell above does not
      // reliably register with every enclosing GXT effect, so dirtyTagFor is
      // the authoritative re-render signal for trackedObject mutations.
      try {
        dirtyTagFor(target as any, prop);
      } catch { /* noop */ }
      return true;
    },
  });
}
