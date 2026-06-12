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
import { cell as _gxtNativeCell, syncDom as _gxtSyncDom } from '@lifeart/gxt';
// Routes the track() reentrancy-guard save-restore through the typed bridge
// helper. See `withTriggerSuppressed` doc in gxt-bridge.ts.
import { getGxtRenderer } from './gxt-bridge';

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

// trackedObjectCell: a native GXT cell (not a storage-wrapped cell). Used by
// trackedObject so property reads/writes register with GXT's effect tracker
// the same way @lifeart/gxt's own cell() does. The storage-wrapped cell above
// goes through an older compatibility shim that does not always plug into
// GXT's effect tracking, which broke trackedObject reactivity through the
// renderComponent args-proxy path.
const createTrackedObjectCell = (initialValue: any, name?: string) => {
  const c = _gxtNativeCell(initialValue, name || 'trackedObject');
  return {
    get value() {
      return c.value;
    },
    set value(v: any) {
      c.update(v);
    },
  };
};

// Create formula using cache
const formula = <T>(fn: () => T, name?: string) => {
  const cache = caching.createCache(fn);
  return {
    get value() {
      return caching.getValue(cache);
    },
  };
};

// Re-export most validator functions directly
export const {
  tagFor: gxtTagFor,
  isTracking: gxtIsTracking,
  tagMetaFor,
  track: gxtTrack,
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

  // Suppress __gxtTriggerReRender during track() to prevent infinite
  // recursion when a getter calls notifyPropertyChange (which triggers
  // __gxtTriggerReRender → re-reads getter → notifyPropertyChange → …).
  //
  // Routed through the typed `compilePipeline.withTriggerSuppressed(fn)`
  // helper that encapsulates the save-restore pattern. Fallback to the
  // inline save-restore is preserved for the (rare) case where the bridge
  // hasn't been populated yet — should only happen before compile.ts's
  // module-init `installCompilePipelinePart` call has fired, and `track()`
  // is not reachable during that window in any known entry point. See
  // `withTriggerSuppressed` doc in gxt-bridge.ts.

  // Run the callback. The tracked getters read GXT cells, establishing
  // dependencies. Those cells can't be captured directly, but changes can be
  // detected by re-running the callback later and checking if any tracked
  // values changed.
  //
  // Store the callback itself, plus a snapshot of tracked values via a
  // version counter. Each time a tracked cell is dirtied (via dirtyTagFor),
  // bump a global revision. Compare the revision at snapshot time vs current
  // to detect changes.
  const revisionBefore = globalRevisionCounter;

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

  // The bridge `withTriggerSuppressed(fn)` helper is the single suppression
  // surface. Avoid `?? _runTrack()` because `_runTrack` returns `undefined`
  // and would cause a second invocation; instead branch on whether the bridge
  // method is installed.
  const _withSuppressed = getGxtRenderer()?.compilePipeline.withTriggerSuppressed;
  if (_withSuppressed) {
    _withSuppressed(_runTrack);
  } else {
    _runTrack();
  }

  // If no specific tags were consumed, the frame's `cb()` did not depend
  // on any tracked state — by definition a constant. Return CONSTANT_TAG so
  // CheckTag / validateTag treat it as never-invalidating. This matches
  // classic @glimmer/validator semantics (track() with no consumed tags
  // returns CONSTANT_TAG) and is essential for e.g. `updateTag(modifierTag,
  // track(install))` in environment.ts: when a modifier's install hook
  // reads only constant args (`{{foo "foo" bar="baz"}}`), the outer modifier
  // tag must not invalidate on every unrelated mutation (fixes the
  // `didUpdate is not called when params are constants` test).
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
  // This cache's own revision (bumped when its value actually changes)
  let _revision = 0;
  // Tags consumed via consumeTag during fn()
  let _consumedTags: any[] = [];
  let _consumedTagSnapshots: any[] = [];
  // Nested caches read during fn() and their revisions at that time
  let _nestedCaches: any[] = [];
  let _nestedCacheRevisions: number[] = [];
  // If the most recent _evaluate() call threw, store the error so that
  // subsequent .value reads observed by validation as "still valid" can
  // re-throw the same error rather than serving the previous successful
  // _lastValue (which would be a stale, pre-throw value). This mirrors
  // stock @glimmer/reference semantics where a Reference whose compute
  // throws does NOT cache lastValue/lastRevision, so the next valueForRef
  // recomputes (and re-throws). Cleared on the next successful _evaluate.
  // Required by the debug-render-tree test "emberish curly components"
  // where {{this.obj.getterWithError}} starts returning, then throws
  // after `obj.doFail = true` — reifyArgsDebug must observe the throw to
  // wrap arg2 with ArgumentErrorImpl.
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
        cacheObj._isCacheConst = _consumedTags.length === 0 && _nestedCaches.length === 0;
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
      // Forward consumed tags to an enclosing gxt track frame / createCache
      // frame, so that cached reads still expose the underlying dependencies
      // to whichever tracker is currently active. Without this, a template
      // formula that reads the cache during initial evaluation would never
      // re-run when the underlying tracked state changes, because our cache
      // short-circuits with _lastValue and never re-enters consumeTag.
      if (_initialized && _consumedTags.length > 0) {
        const gxtTracking = gxtIsTracking();
        const cacheTrackingActive = _cacheTagTracker.length > 0;
        // Also forward into the shim's OWN classic frames (track() /
        // beginTrackFrame). gxtIsTracking() is NOT a proxy for those: in the
        // production gxt dist the tracking introspection is stubbed out and
        // gxtIsTracking() reports false even while a classic track() frame is
        // open (the dev dist reports true, which masked this gap). Without
        // this, a cache read inside e.g. the env-commit's modifier-install
        // track() forwards nothing, the frame degrades to CONSTANT_TAG, and
        // rerender updates never reach the modifier/component.
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

export function isInBacktrackingFrame() {
  return _backtrackingFrame !== null;
}

// beginBacktrackingFrame / endBacktrackingFrame are installed on the typed
// gxt-bridge by manager.ts (which already imports both from this file).
// Readers in helper-manager.ts and ember-gxt-wrappers.ts go through
// `getGxtRenderer()?.backtracking.{begin,end}Frame` — no globalThis write
// needed here.

// Expose classic tag primitives for gxt-backend/manager.ts so component-arg
// own-property getters can participate in createCache/invokeHelper tag tracking.
// The classic-reactivity hooks formerly published as
// `globalThis.__classicConsumeTag` / `__classicTagFor` /
// `__classicDirtyTagFor` are now reached via direct imports (intra-package)
// and the typed `compilePipeline.classicConsumeTag/classicTagFor/
// classicDirtyTagFor` bridge methods (cross-package) — see manager.ts's
// setGxtRenderer install and docs-internal-gxt-globalthis-wiring.md §2c.

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

      // Register this cell's tag with the active track() / createCache frame
      // so `track(() => getter(obj))` captures the dependency. Without this,
      // an empty frame would return CONSTANT_TAG and `validateTag(tag, snap)`
      // would never invalidate after a setter call — regressing
      // `@glimmer/validator: tracking :: it tracks changes to the storage cell`.
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
        // Backtracking detection: if this cell was read in the current frame,
        // setting it is backtracking
        if (_backtrackingFrame !== null && _backtrackingFrame.has(cellForKey)) {
          const info = _backtrackingFrame.get(cellForKey)!;
          // Try to get a useful name: class name, toString, or fallback
          const rawObj = info.obj as any;
          const objName =
            rawObj?.constructor?.name && rawObj.constructor.name !== 'Object'
              ? rawObj.constructor.name
              : rawObj?.toString?.() !== '[object Object]'
                ? rawObj?.toString?.()
                : '<unknown>';
          // Clear the frame before calling assert to prevent recursion
          _backtrackingFrame = null;
          const renderTree = _backtrackingDebugName
            ? `(result of a \`${_backtrackingDebugName}\` helper)`
            : '(unknown)';
          const msg = `You attempted to update \`${String(info.key)}\` on \`${objName}\`, but it had already been used previously in the same computation. Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.\n\n\`${String(info.key)}\` was first used:\n\n- While rendering:\n  - top-level\n    ${renderTree}\n\nStack trace for the update:`;
          // Use the Ember assert function directly. The __emberAssertDirect
          // is a live reference to the assert from @ember/debug, which
          // is updated when expectAssertion stubs it via setDebugFunction.
          const assertDirect = (globalThis as any).__emberAssertDirect;
          if (typeof assertDirect === 'function') {
            assertDirect(msg, false);
          }
        }
        // Debug tracking transaction: if this cell was read earlier in
        // the current runInTrackingTransaction frame or track() frame,
        // surface the Ember-style assertion matching classic @glimmer/validator
        // behavior. Uses __emberAssertDirect so expectAssertion() can catch it.
        if (_debugTransactionConsumed !== null && _debugTransactionConsumed.has(cellForKey)) {
          const label = _debugTransactionLabelForTag?.get(cellForKey);
          const msg = `You attempted to update \`${label}\`, but it had already been used previously in the same computation`;
          const assertDirect = (globalThis as any).__emberAssertDirect;
          if (typeof assertDirect === 'function') {
            assertDirect(msg, false);
          } else {
            throw new Error(`Assertion Failed: ${msg}`);
          }
        }
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
export const CLASSIC_TAG_BRIDGE = _classicBridgeCell;
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
// Leak diagnostics: each reactor is tagged with metadata at registration
// time so cross-test leakage can be detected — a reactor registered during
// test A that fires during test B is by definition a leak. Verbose logging
// is enabled via the global flag `__GXT_LEAK_DEBUG__` (set in index.html or
// via URL param).
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
  if ((globalThis as any).__GXT_LEAK_DEBUG__) {
    if (id <= 50 || id % 100 === 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[leak-debug] registerClassicReactor #${id} source=${source || '?'} test="${_currentTestName()}" total=${_classicReactors.size}`
      );
    }
  }
  return () => {
    _classicReactors.delete(cb);
    _reactorMeta.delete(cb);
  };
}

// Hard cap on TOTAL fires (any test). Catches the rare case where a
// reactor is in a tight self-fire loop within one test. 50,000 is far
// above any plausible legitimate bound — real reactors fire ~1,000 times
// per test for renderComponent paths.
const REACTOR_FIRE_HARD_CAP = 50_000;

// Cap on fires WITHIN A SINGLE foreign test (catches fast leaks).
const REACTOR_FOREIGN_FIRE_CAP = 100;
// Cap on CUMULATIVE fires across all foreign tests (never resets).
// Hard-unsubscribing a capped reactor (removing it from _classicReactors)
// regresses many unrelated tests, because that breaks the side-channel
// classic-tag bridge mechanics those tests rely on. Instead, SOFT-DISABLE:
// keep the reactor in _classicReactors so iteration cost is paid (preserving
// the bridge bookkeeping) but skip invoking cb (the expensive work that
// produces the runaway). The cap can stay low since the soft disable doesn't
// disturb the bridge.
const REACTOR_TOTAL_FOREIGN_FIRE_CAP = 200;
const NO_TEST_SENTINEL = '<no-test>';

function _fireClassicReactors() {
  if (_classicReactors.size === 0) return;
  // Copy to avoid mutation during iteration
  const snapshot = Array.from(_classicReactors);
  const debug = (globalThis as any).__GXT_LEAK_DEBUG__;
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
        if (debug) {
          // eslint-disable-next-line no-console
          console.log(
            `[leak-debug] CAP reactor #${meta.id} src=${meta.source} regAt="${meta.registeredAtTest}" fires=${meta.fireCount} — disabling`
          );
        }
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
          if (debug) {
            // eslint-disable-next-line no-console
            console.log(
              `[leak-debug] CAP_FOREIGN reactor #${meta.id} src=${meta.source} regAt="${meta.registeredAtTest}" firedIn="${currentTest}" foreignFires=${meta.foreignFires} totalForeignFires=${meta.totalForeignFires} — disabling`
            );
          }
          meta.disabled = true;
          continue;
        }
        if (debug) {
          // eslint-disable-next-line no-console
          console.log(
            `[leak-debug] LEAK reactor #${meta.id} src=${meta.source} regAt="${meta.registeredAtTest}" firedIn="${currentTest}" fires=${meta.fireCount} foreignFires=${meta.foreignFires} totalForeignFires=${meta.totalForeignFires}`
          );
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

// The `_classicReactors` set and `_reactorMeta` map are live state used by
// the surrounding leak-tracking instrumentation (the foreign-fire counters in
// `_fireClassicReactors` above) and by `dirtyTagFor` below. The diagnostic
// `__gxtLeakSnapshot` global writer that previously lived here was a no-op
// unless `globalThis.__GXT_LEAK_DEBUG__` was set, and had no live consumers,
// so it was removed.

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

  // Mark GXT sync as pending so __gxtSyncDomNow processes the force-rerender.
  // Without this, set() on components dirtied Glimmer tags but __gxtPendingSync
  // stayed false, causing __gxtSyncDomNow to be a no-op.
  //
  // Skip scheduling (but preserve dirty-tag semantics above) during rcSet
  // internal arg write-backs. Those writes fire rcSet → dirtyTagFor;
  // rescheduling another sync triggers a backburner re-entry loop on curly
  // tests. The tag still needs to be marked dirty and the global revision
  // bumped so within-sync template re-reads see the new value.
  //
  // The suppression flag is read through the typed-bridge predicate
  // `compilePipeline.isDirtyInRcSetSuppressed?.()`. It returns `undefined`
  // when the bridge isn't installed yet (the optional chain short-circuits),
  // which the `!` coerces to FALSE so the schedule call runs — the same
  // behavior as when the flag is unset.
  if (!getGxtRenderer()?.compilePipeline.isDirtyInRcSetSuppressed?.()) {
    // Mark GXT sync pending. Formerly called the `__gxtExternalSchedule`
    // global slot — hook-capable dists no longer publish it (§2d host hooks);
    // the `setPendingSync` pipeline member is the seam in both modes and its
    // body is exactly what the slot did.
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
      // here — which can run INSIDE a render formula frame (any set() during
      // render lands in dirtyTagFor) — lazily creates a reactivity cell for
      // this bookkeeping Map. Every later cache.set() inside a helper effect
      // then subscribes that effect to the cache, and any subsequent cache
      // mutation re-fires ALL such effects — including stale ones from
      // already-collapsed {{#if}} branches ("evaluation should be lazy",
      // "class-based helper lifecycle" prod failures). Native forEach is not
      // patched and keeps this infrastructure Map invisible to tracking.
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
  get value() {
    return Date.now() + Math.random();
  },
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

// Track tag revisions for proper validation.
// globalRevisionCounter is the single source of truth for all revisions, so
// track tags, dirty tags, and snapshot revisions are all comparable.
const tagLastSnapshotRevision = new WeakMap<object, number>();

// Track dirty revisions - when a tag was last dirtied (in globalRevisionCounter space)
const tagDirtyRevision = new WeakMap<object, number>();

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

// Update the revision snapshot for a tag (called after observer fires)
export function updateTagRevision(tag: any): number {
  // Use the current globalRevisionCounter - don't bump it since no actual mutation happened
  tagLastSnapshotRevision.set(tag, globalRevisionCounter);
  return globalRevisionCounter;
}

// Reset tracking state (used in testing)
// Mirrors classic @glimmer/validator's resetTracking ("This function is only
// for handling errors and resetting to a valid state"): a render that throws
// mid-frame (e.g. the classic VM's beginCacheGroup with no matching
// commitCacheGroup on the unwind path) strands open frames. The test harness
// calls this at every testStart; without a real implementation the stranded
// frames keep isTracking() true for the rest of the realm and poison every
// later frame-semantics check in cumulative runs.
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
// wrapped cell does NOT entangle reads with GXT's effect/formula tracker (same
// gap documented for `createTrackedObjectCell`): reading its `.value` inside a
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
    outer._subBufferedAt = globalRevisionCounter;
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
  // Return a "combined"-like tag that tracks only the specific tags that
  // were consumed within this frame, so validateTag only invalidates when
  // one of those tags changes — not on any global counter bump.
  const deps = Array.from(consumed);
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
    // `{{row.label.current}}` inside a keyed `{{#each}}`) must flush through
    // the COALESCED, non-clearing `_scheduleCollectionFlush()` — NOT the
    // property-driven `syncDomNow()`. `syncDomNow()`'s non-property-driven branch
    // CLEARS `tagsToRevalidate`, discarding the just-dirtied cell + its
    // subscribed text opcode (the dirty originates from a custom cell's
    // `.set()`, not a tracked-property write, so `_gxtHadPendingSync` is
    // false). `_scheduleCollectionFlush()` runs ONE `_gxtSyncDom()` microtask that
    // re-runs only the genuinely-subscribed opcodes — the same flush the reactive
    // collections (`trackedArray`) already use for in-place mutation. Scoped to
    // `_isUpdatableCellTag` (set only by `createUpdatableTag`); `tagFor()` cells,
    // `createTag()` dirtyable-only tags (helper `recompute()`), and the classic-CP
    // `@tracked` `dirtyTagFor` path are all untouched and keep the synchronous
    // `syncDomNow()` flush below.
    if (tag._isUpdatableCellTag === true) {
      _scheduleCollectionFlush();
      return;
    }
    // Flush GXT DOM sync so the updated value is visible immediately.
    // The canonical `_gxtSyncDomNow` lives in `compile.ts`; this cross-file
    // reader routes through the bridge method. See `syncDomNow` doc in
    // gxt-bridge.ts.
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

// --- Tag-based tracked collections ---------------------------------------
//
// These implementations port the stock @glimmer/validator collection proxies
// to the classic-tag infrastructure here. Each tracked collection uses the
// local createUpdatableTag() + consumeTag() + dirtyTag() so that reads during a
// createCache()/createComputeRef compute register into `_cacheTagTracker`
// and writes bump the tag's cell revision — causing the reference to be
// observed as invalid by the Glimmer VM's CheckTag/validateTag pipeline on
// the next rerender.
//
// Supports the second `options` argument with an `equals` function (defaults
// to Object.is) so `{ equals: () => false }` always-dirty tests pass.

interface ReactiveOptions<V> {
  equals: (a: V, b: V) => boolean;
  description?: string;
}

function resolveReactiveOptions<V>(options?: {
  equals?: (a: V, b: V) => boolean;
  description?: string;
}): ReactiveOptions<V> {
  return {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  };
}

// ---- trackedArray -------------------------------------------------------

// Coalesced DOM-sync flush for reactive-collection structural mutations.
// A single `push(...thousand)` / `splice` fires the collection's `set` trap
// many times; it must NOT re-render per element. Each `dirtyCollection`
// schedules ONE GXT `syncDom()` via a microtask (deduped by
// `_collectionFlushScheduled`). The microtask runs after the (synchronous)
// mutation method returns but BEFORE the benchmark's `requestIdleCallback`, so
// the DOM is up to date when correctness is checked. GXT's own auto-scheduler
// is suppressed in this build by the gxt-backend's `__gxtExternalSchedule`
// no-op hook (it only sets a pending flag — `compile.ts`), so a GXT cell write
// (`collection.dirty()`) enqueues the dependent opcode but nothing flushes it;
// this microtask is the flush point. `syncDom()` (NOT `flushCellOpcodes` —
// that only registers opcode/destructor pools) processes the dirty-opcode
// queue, re-running the each-source-formula-subscribed list opcode →
// `syncList(newArray)` → keyed LIS diff (move/insert/remove by key, reusing
// row instances). Fine-grained: only the dirtied list opcode re-runs; NO whole-
// root re-render, so the host template's `this` context is untouched.
let _collectionFlushScheduled = false;
function _scheduleCollectionFlush(): void {
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

// Hidden accessor symbol: a reactive-collection proxy returns its internal
// `collection` tag (the native-GXT-cell-backed `createUpdatableTagNative`) when
// read with this key. The each-source formula uses it to entangle directly with
// the collection's GXT cell (compile.ts `_gxtSubscribeBackingArray` for
// `$_eachSync`; glimmer-next list.ts `subscribeReactiveCollection` for
// `$_each`). A registered Symbol so the SAME key works across the ember-source
// bundle and the glimmer-next bundle without a cross-package import. Shared by
// any reactive collection wanting fine-grained each re-render on structural
// mutation.
export const GXT_COLLECTION_TAG: unique symbol = Symbol.for('@ember/reactive:gxt-collection-tag');

const ARRAY_GETTER_METHODS = new Set<string | symbol>([
  Symbol.iterator,
  'concat',
  'entries',
  'every',
  'filter',
  'find',
  'findIndex',
  'flat',
  'flatMap',
  'forEach',
  'includes',
  'indexOf',
  'join',
  'keys',
  'lastIndexOf',
  'map',
  'reduce',
  'reduceRight',
  'slice',
  'some',
  'values',
]);

// Methods where Array itself immediately reads `.length` after invocation.
const ARRAY_WRITE_THEN_READ_METHODS = new Set<string | symbol>(['fill', 'push', 'unshift']);

function convertArrayIndexKey(prop: string | symbol): number | null {
  if (typeof prop === 'symbol') return null;
  const num = Number(prop);
  if (isNaN(num)) return null;
  return num % 1 === 0 ? num : null;
}

export function trackedArray<T = unknown>(
  data?: T[],
  options?: { equals?: (a: T, b: T) => boolean; description?: string }
): T[] {
  const resolved = resolveReactiveOptions<T>(options);
  const arr: T[] = Array.isArray(data) ? data.slice() : [];
  // Native-cell-backed (entangles with the GXT formula tracker) so the
  // gxt-backend each-source formula can SUBSCRIBE to structural mutation via
  // the `GXT_COLLECTION_TAG` accessor. The storage-wrapped `createUpdatableTag`
  // does not entangle (see `createUpdatableTagNative` doc) — which is why a
  // `{{#each trackedArray}}` did not re-render on in-place push/splice/swap.
  const collection = createUpdatableTagNative();
  const storages = new Map<number, ReturnType<typeof createUpdatableTag>>();
  const boundFns = new Map<string | symbol, (...args: any[]) => any>();
  let nativelyAccessingLengthFromWriteMethod = false;

  const readStorageFor = (index: number) => {
    let storage = storages.get(index);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(index, storage);
    }
    consumeTag(storage);
  };

  const dirtyStorageFor = (index: number) => {
    const storage = storages.get(index);
    if (storage) dirtyTag(storage);
  };

  // Will be assigned to the Proxy once created (the proxy is the object a
  // `{{#each this.foo}}` source resolves to, and what the gxt-backend registers
  // in its array-owner map). `dirtyCollection` references it lazily.
  let proxy: T[];

  const dirtyCollection = () => {
    // Invalidate the collection's native GXT cell directly (NOT via `dirtyTag`,
    // which force-flushes `syncDomNow()` on EVERY call — catastrophic when a
    // single `push(...thousand)` fires this trap 1000×). `dirty()` marks the
    // cell stale → the each-source-formula/list opcode entangled with it
    // (compile.ts `_gxtSubscribeBackingArray` for `$_eachSync`, list.ts
    // `subscribeReactiveCollection` for `$_each`) is enqueued. The actual DOM
    // sync is COALESCED into ONE GXT `syncDom()` microtask (see
    // `_scheduleCollectionFlush`) — so a `push(...N)` re-renders the keyed list
    // ONCE, not N times.
    collection.dirty();
    storages.clear();
    _scheduleCollectionFlush();
  };

  proxy = new Proxy(arr, {
    get(target, prop) {
      const index = convertArrayIndexKey(prop);
      if (index !== null) {
        readStorageFor(index);
        consumeTag(collection);
        return (target as any)[index];
      }

      if (prop === 'length') {
        if (nativelyAccessingLengthFromWriteMethod) {
          nativelyAccessingLengthFromWriteMethod = false;
        } else {
          consumeTag(collection);
        }
        return (target as any).length;
      }

      if (ARRAY_WRITE_THEN_READ_METHODS.has(prop)) {
        nativelyAccessingLengthFromWriteMethod = true;
      }

      if (ARRAY_GETTER_METHODS.has(prop)) {
        let fn = boundFns.get(prop);
        if (!fn) {
          fn = (...args: any[]) => {
            consumeTag(collection);
            return (target as any)[prop](...args);
          };
          boundFns.set(prop, fn);
        }
        return fn;
      }

      // GXT fine-grained each-source subscription hook (gated, GXT-backend only).
      // The gxt-backend each-source formula (`compile.ts` `_gxtSubscribeBackingArray`)
      // needs to ENTANGLE the formula with this collection's reactive `collection`
      // tag so an in-place mutation (push/splice/swap/length=0) re-fires the keyed
      // list opcode. Going through `consumeTag(collection)` only re-reads the tag's
      // `value` getter — which does NOT reliably register the underlying GXT cell
      // with the active formula tracker (the wrapper getter loses the `qt.add(cell)`
      // entanglement). Exposing the `collection` tag here lets the formula read the
      // backing GXT cell DIRECTLY (`tag._innerCell.value`), which DOES entangle.
      // Symbol-keyed so it never collides with a real array property and stays
      // invisible to enumeration / `JSON.stringify` / template reads.
      if (prop === GXT_COLLECTION_TAG) {
        return collection;
      }

      return (target as any)[prop];
    },
    set(target, prop, value) {
      const isUnchanged = resolved.equals((target as any)[prop], value);
      if (isUnchanged) return true;

      (target as any)[prop] = value;

      const index = convertArrayIndexKey(prop);
      if (index !== null) {
        dirtyStorageFor(index);
        dirtyCollection();
      } else if (prop === 'length') {
        dirtyCollection();
      }
      return true;
    },
    getPrototypeOf() {
      return Array.prototype;
    },
  });
  return proxy as T[];
}

// ---- trackedMap ---------------------------------------------------------

export function trackedMap<K = unknown, V = unknown>(
  data?: Map<K, V> | Iterable<readonly [K, V]> | readonly (readonly [K, V])[] | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): Map<K, V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: Map<K, V> = data instanceof Map ? new Map(data.entries()) : new Map(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<K, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: K) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: K) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedMapImpl implements Map<K, V> {
    get(key: K): V | undefined {
      consumeTag(storageFor(key));
      return vals.get(key);
    }
    has(key: K): boolean {
      consumeTag(storageFor(key));
      return vals.has(key);
    }
    entries() {
      consumeTag(collection);
      return vals.entries();
    }
    keys() {
      consumeTag(collection);
      return vals.keys();
    }
    values() {
      consumeTag(collection);
      return vals.values();
    }
    forEach(fn: (value: V, key: K, map: Map<K, V>) => void): void {
      consumeTag(collection);
      vals.forEach((v, k) => fn(v, k, this));
    }
    get size(): number {
      consumeTag(collection);
      return vals.size;
    }
    [Symbol.iterator](): MapIterator<[K, V]> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const self = this;
      const keys = this.keys();
      return {
        next(): IteratorResult<[K, V]> {
          const next = keys.next();
          if (next.done) {
            return { value: undefined as any, done: true };
          }
          const k = next.value as K;
          return { value: [k, self.get(k) as V], done: false };
        },
        return(value?: any): IteratorResult<[K, V]> {
          return { value, done: true };
        },
        throw(err?: any): IteratorResult<[K, V]> {
          throw err;
        },
        [Symbol.iterator](): MapIterator<[K, V]> {
          return this as any;
        },
      } as MapIterator<[K, V]>;
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
    set(key: K, value: V): this {
      const existing = vals.get(key);
      if (vals.has(key)) {
        const isUnchanged = resolved.equals(existing as V, value);
        if (isUnchanged) return this;
      }
      dirtyStorageFor(key);
      // Always dirty the collection tag — consumers iterating via
      // values()/entries()/forEach()/keys()/Symbol.iterator track this
      // tag and must re-evaluate when ANY value changes, not just on
      // new-key insertion. Matches the reference impl in
      // @glimmer/validator/lib/collections/map.ts.
      dirtyTag(collection);
      vals.set(key, value);
      return this;
    }
    getOrInsert(key: K, defaultValue: V): V {
      // Matches reference Map.prototype.getOrInsert semantics:
      // if key exists, consume per-key tag and return existing value;
      // otherwise insert default value (dirty per-key + collection tags
      // mirroring set()) and return it. The class-based impl must
      // implement this explicitly — Object.setPrototypeOf(...,Map.prototype)
      // exposes the method name on the prototype but Map.prototype.getOrInsert
      // throws "incompatible receiver" when invoked on a non-Map instance.
      if (vals.has(key)) {
        consumeTag(storageFor(key));
        return vals.get(key) as V;
      }
      dirtyStorageFor(key);
      dirtyTag(collection);
      vals.set(key, defaultValue);
      return defaultValue;
    }
    getOrInsertComputed(key: K, callback: (key: K) => V): V {
      // See getOrInsert above — same rationale (Map.prototype.getOrInsertComputed
      // throws on a non-Map receiver, so we must implement it explicitly).
      if (vals.has(key)) {
        consumeTag(storageFor(key));
        return vals.get(key) as V;
      }
      const computed = callback(key);
      dirtyStorageFor(key);
      dirtyTag(collection);
      vals.set(key, computed);
      return computed;
    }
    delete(key: K): boolean {
      // Spec: returns false when the key did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/map.ts).
      if (!vals.has(key)) return false;
      dirtyStorageFor(key);
      dirtyTag(collection);
      storages.delete(key);
      return vals.delete(key);
    }
    clear(): void {
      if (vals.size === 0) return;
      storages.forEach((s) => dirtyTag(s));
      storages.clear();
      dirtyTag(collection);
      vals.clear();
    }
  }

  Object.setPrototypeOf(TrackedMapImpl.prototype, Map.prototype);
  return new TrackedMapImpl();
}

// ---- trackedSet ---------------------------------------------------------

export function trackedSet<V = unknown>(
  data?: Set<V> | V[] | Iterable<V> | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): Set<V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: Set<V> = new Set(data ?? []);
  const collection = createUpdatableTag();
  const storages = new Map<V, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: V) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: V) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedSetImpl implements Set<V> {
    has(value: V): boolean {
      consumeTag(storageFor(value));
      return vals.has(value);
    }
    entries() {
      consumeTag(collection);
      return vals.entries();
    }
    keys() {
      consumeTag(collection);
      return vals.keys();
    }
    values() {
      consumeTag(collection);
      return vals.values();
    }
    union<U>(other: ReadonlySetLike<U>): Set<V | U> {
      consumeTag(collection);
      return (vals as any).union(other);
    }
    intersection<U>(other: ReadonlySetLike<U>): Set<V & U> {
      consumeTag(collection);
      return (vals as any).intersection(other);
    }
    difference<U>(other: ReadonlySetLike<U>): Set<V> {
      consumeTag(collection);
      return (vals as any).difference(other);
    }
    symmetricDifference<U>(other: ReadonlySetLike<U>): Set<V | U> {
      consumeTag(collection);
      return (vals as any).symmetricDifference(other);
    }
    isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isSubsetOf(other);
    }
    isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isSupersetOf(other);
    }
    isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
      consumeTag(collection);
      return (vals as any).isDisjointFrom(other);
    }
    forEach(fn: (v1: V, v2: V, set: Set<V>) => void): void {
      consumeTag(collection);
      vals.forEach((v1, v2) => fn(v1, v2, this));
    }
    get size(): number {
      consumeTag(collection);
      return vals.size;
    }
    [Symbol.iterator](): SetIterator<V> {
      consumeTag(collection);
      return vals[Symbol.iterator]();
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
    add(value: V): this {
      if (vals.has(value)) {
        const isUnchanged = resolved.equals(value, value);
        if (isUnchanged) return this;
      } else {
        dirtyTag(collection);
      }
      dirtyStorageFor(value);
      vals.add(value);
      return this;
    }
    delete(value: V): boolean {
      // Spec: returns false when the value did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/set.ts).
      if (!vals.has(value)) return false;
      dirtyStorageFor(value);
      dirtyTag(collection);
      storages.delete(value);
      return vals.delete(value);
    }
    clear(): void {
      if (vals.size === 0) return;
      storages.forEach((s) => dirtyTag(s));
      dirtyTag(collection);
      storages.clear();
      vals.clear();
    }
  }

  Object.setPrototypeOf(TrackedSetImpl.prototype, Set.prototype);
  return new TrackedSetImpl();
}

// ---- trackedWeakMap -----------------------------------------------------

export function trackedWeakMap<K extends WeakKey = object, V = unknown>(
  data?: WeakMap<K, V> | [K, V][] | Iterable<readonly [K, V]> | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): WeakMap<K, V> {
  const resolved = resolveReactiveOptions<V>(options);
  // NOTE: WeakMap is not iterable, so if we receive one we must wrap it by
  // reference (not clone).
  const vals: WeakMap<K, V> = data instanceof WeakMap ? data : new WeakMap<K, V>(data as any);
  const storages = new WeakMap<K, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: K) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: K) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedWeakMapImpl implements WeakMap<K, V> {
    get(key: K): V | undefined {
      consumeTag(storageFor(key));
      return vals.get(key);
    }
    has(key: K): boolean {
      consumeTag(storageFor(key));
      return vals.has(key);
    }
    set(key: K, value: V): this {
      const existing = vals.get(key);
      if (vals.has(key)) {
        const isUnchanged = resolved.equals(existing as V, value);
        if (isUnchanged) return this;
      }
      dirtyStorageFor(key);
      vals.set(key, value);
      return this;
    }
    delete(key: K): boolean {
      // Spec: returns false when the key did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/weak-map.ts).
      if (!vals.has(key)) return false;
      dirtyStorageFor(key);
      storages.delete(key);
      return vals.delete(key);
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
  }

  Object.setPrototypeOf(TrackedWeakMapImpl.prototype, WeakMap.prototype);
  return new TrackedWeakMapImpl();
}

// ---- trackedWeakSet -----------------------------------------------------

export function trackedWeakSet<V extends WeakKey = object>(
  data?: V[] | null,
  options?: { equals?: (a: V, b: V) => boolean; description?: string }
): WeakSet<V> {
  const resolved = resolveReactiveOptions<V>(options);
  const vals: WeakSet<V> = new WeakSet<V>(data ?? []);
  const storages = new WeakMap<V, ReturnType<typeof createUpdatableTag>>();

  const storageFor = (key: V) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    return storage;
  };
  const dirtyStorageFor = (key: V) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };

  class TrackedWeakSetImpl implements WeakSet<V> {
    has(value: V): boolean {
      consumeTag(storageFor(value));
      return vals.has(value);
    }
    add(value: V): this {
      if (vals.has(value)) {
        const isUnchanged = resolved.equals(value, value);
        if (isUnchanged) return this;
      }
      vals.add(value);
      dirtyStorageFor(value);
      return this;
    }
    delete(value: V): boolean {
      // Spec: returns false when the value did not exist (matches the
      // reference impl in @glimmer/validator/lib/collections/weak-set.ts).
      if (!vals.has(value)) return false;
      dirtyStorageFor(value);
      storages.delete(value);
      return vals.delete(value);
    }
    get [Symbol.toStringTag](): string {
      return vals[Symbol.toStringTag];
    }
  }

  Object.setPrototypeOf(TrackedWeakSetImpl.prototype, WeakSet.prototype);
  return new TrackedWeakSetImpl();
}

// ---- trackedObject ------------------------------------------------------

// Create a tracked object - wraps an object to make all its properties reactive.
// The proxy creates an independent shallow copy of own properties so mutations
// do not leak back to the original object.
export function trackedObject<T extends object>(
  obj?: T,
  options?: {
    equals?: (a: any, b: any) => boolean;
    description?: string;
  }
): T {
  const resolved = resolveReactiveOptions<any>(options);
  if (!obj || typeof obj !== 'object') {
    obj = {} as T;
  }
  // Shallow-copy own enumerable properties into `data`. Getters/setters on the
  // original are transferred as descriptors so `this` inside the getter refers
  // to the proxy.
  const proto = Object.getPrototypeOf(obj);
  const data: Record<string | symbol, any> = Object.create(proto);
  const ownKeys = Reflect.ownKeys(obj);
  for (const key of ownKeys) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if (desc) {
      Object.defineProperty(data, key, desc);
    }
  }

  const storages = new Map<PropertyKey, ReturnType<typeof createUpdatableTag>>();
  const collection = createUpdatableTag();

  const readStorageFor = (key: PropertyKey) => {
    let storage = storages.get(key);
    if (!storage) {
      storage = createUpdatableTag();
      storages.set(key, storage);
    }
    consumeTag(storage);
  };
  const dirtyStorageFor = (key: PropertyKey) => {
    const storage = storages.get(key);
    if (storage) dirtyTag(storage);
  };
  const dirtyCollection = () => {
    dirtyTag(collection);
  };

  return new Proxy(data as unknown as T, {
    get(target, prop) {
      readStorageFor(prop);
      return (target as any)[prop];
    },
    has(target, prop) {
      readStorageFor(prop);
      return prop in target;
    },
    ownKeys(target) {
      consumeTag(collection);
      return Reflect.ownKeys(target);
    },
    set(target, prop, value) {
      const isUnchanged = resolved.equals((target as any)[prop], value);
      if (isUnchanged) return true;
      (target as any)[prop] = value;
      dirtyStorageFor(prop);
      dirtyCollection();
      // Also fire classic dirtyTagFor for any legacy observers.
      try {
        dirtyTagFor(target as any, prop);
      } catch {
        /* noop */
      }
      return true;
    },
    deleteProperty(target, prop) {
      if (prop in target) {
        delete (target as any)[prop];
        dirtyStorageFor(prop);
        storages.delete(prop);
        dirtyCollection();
      }
      return true;
    },
    getOwnPropertyDescriptor(target, prop) {
      const desc = Reflect.getOwnPropertyDescriptor(target, prop);
      if (desc) {
        desc.configurable = true;
      }
      return desc;
    },
  });
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
