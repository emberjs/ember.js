// Import from glimmer-compatibility to avoid gxt compiler conflicts
import { validator, caching, storage } from '@lifeart/gxt/glimmer-compatibility';
// Direct import of GXT's native cell primitive (NOT via storage wrapper) so we
// can bridge classic @glimmer/validator tag mutations into GXT's effect system.
// Using the same cell factory that _gxtEffect tracks ensures reads inside an
// effect register a subscription that will re-fire the effect on updates.
import { cell as _gxtNativeCell } from '@lifeart/gxt';
// Namespace import for live binding access to scheduleRevalidate (swapped by
// testOverrideGlobalContext during tests).
import * as _globalContext from '@glimmer/global-context';

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

// ---- Classic @glimmer/validator tracking semantics ----
//
// We maintain a stack of frames. Each frame is either a track frame (which
// collects consumed tags) or an untrack frame (which blocks propagation).
// isTracking() returns true iff the topmost frame is a track frame.
type TrackFrame =
  | { kind: 'track'; tags: Set<any> }
  | { kind: 'untrack' };

const _frameStack: TrackFrame[] = [];

export function track(cb: () => void): any {
  beginTrackFrame();
  try {
    cb();
  } catch (e) {
    // Pop the frame before rethrowing, for consistency
    try { endTrackFrame(); } catch { /* noop */ }
    throw e;
  }
  return endTrackFrame();
}

export function isTracking(): boolean {
  // Inside a cache evaluation (_cacheTagTracker), tracking is implicitly on,
  // unless the topmost explicit frame is an untrack frame.
  if (_frameStack.length > 0) {
    return _frameStack[_frameStack.length - 1]!.kind === 'track';
  }
  return _cacheTagTracker.length > 0;
}

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
      `Error: createCache() must be passed a function as its first parameter. Called with: ${String(fn)}`
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

  const cacheObj = {
    _isCacheObj: true,
    _revision: 0,
    _hasEvaluated: false,
    _isConstCache: false,

    get value(): T {
      if (!_isValid()) {
        const wasInitialized = _initialized;
        const oldValue = _lastValue;
        _lastValue = _evaluate();
        _initialized = true;
        (cacheObj as any)._hasEvaluated = true;
        (cacheObj as any)._isConstCache =
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
      // Forward consumed tags to an enclosing track frame so cached reads
      // still expose the underlying dependencies to whichever tracker is
      // currently active.
      if (_initialized && _consumedTags.length > 0) {
        if (isTracking() || _cacheTagTracker.length > 0) {
          for (let i = 0; i < _consumedTags.length; i++) {
            const tag = _consumedTags[i];
            if (tag == null) continue;
            try { consumeTag(tag); } catch { /* noop */ }
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
  if (!cache || typeof cache !== 'object' || (cache as any)._isCacheObj !== true) {
    throw new Error(
      `Error: getValue() can only be used on an instance of a cache created with createCache(). Called with: ${String(cache)}`
    );
  }
  return cache.value;
}

// Custom trackedData implementation that avoids infinite loops
// The GXT version creates a formula that reads obj[key], which triggers the
// tracked getter again. Our version uses internal WeakMap storage instead.
const trackedDataStorage = new WeakMap<object, Map<string | symbol, ReturnType<typeof createCell>>>();
// Per-(obj,key) dirtyable tag so trackedData reads/writes participate in
// the classic @glimmer/validator tag system.
const trackedDataTags = new WeakMap<object, Map<string | symbol, any>>();
function _tagForTrackedData(obj: object, key: string | symbol): any {
  let m = trackedDataTags.get(obj);
  if (!m) { m = new Map(); trackedDataTags.set(obj, m); }
  let t = m.get(key);
  if (!t) { t = createTag(); m.set(key, t); }
  return t;
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

      // Participate in classic @glimmer/validator tracking — only when a
      // track/untrack frame is active, to avoid creating per-object tag
      // allocations on every read during smoke-test hot paths.
      if (_frameStack.length > 0 || _cacheTagTracker.length > 0) {
        try { consumeTag(_tagForTrackedData(obj, key)); } catch { /* noop */ }
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
        cellForKey.value = value;
      }
      // Dirty the classic tag so track frames & caches observe the mutation.
      const tdTag = _tagForTrackedData(obj, key);
      if (_debugTransactionActive && _debugTxConsumedTags.has(tdTag)) {
        const rawObj = obj as any;
        const objName = rawObj?.constructor?.name || '<unknown>';
        throw new Error(
          `Error: Assertion Failed: You attempted to update \`${String(key)}\` on \`${objName}\`, but it had already been used previously in the same computation.`
        );
      }
      try { dirtyTag(tdTag); } catch (e) {
        if (e instanceof Error && /already been consumed/.test(e.message)) throw e;
      }
    }
  };
}

// Global revision counter - this gets bumped whenever any tag is dirtied
let globalRevisionCounter = 0;

// CURRENT_TAG is a special tag that always reports the latest revision, so
// validateTag(CURRENT_TAG, snap) becomes false after any dirtyTag.
export const CURRENT_TAG: any = {
  _tagType: 5 /* TYPE_CURRENT */,
  _isCurrentTag: true,
  get value() { return $REVISION; },
};

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

// WeakMap bookkeeping for legacy (GXT-produced) tag dirty revisions.
// Updated by dirtyTagFor, read by currentTagRevision fallback.
const _legacyTagRev = new WeakMap<object, number>();

export function dirtyTagFor(obj: any, key: any) {
  // Convert Symbol keys to safe string representation
  const safeKey = typeof key === 'symbol' ? (key.description || String(key)) : key;

  // Bump global revision and $REVISION so all validators see the change
  globalRevisionCounter++;
  $REVISION++;
  // Also bump the classic-tag bridge cell so GXT effects that subscribed via
  // touchClassicBridge() will be re-scheduled on any classic tag mutation.
  _bumpClassicBridge();

  // Get the tag for this property and mark it as dirty. We store the new
  // revision in our WeakMap so currentTagRevision can see it even when the
  // tag is an opaque GXT cell object without our `_tagType`.
  const tag = tagFor(obj, safeKey);
  if (tag && typeof tag === 'object') {
    try { _legacyTagRev.set(tag, $REVISION); } catch { /* noop */ }
    (tag as any)._rev = $REVISION;
  }

  // Mark GXT sync as pending so __gxtSyncDomNow processes the force-rerender.
  // Without this, set() on components dirtied Glimmer tags but __gxtPendingSync
  // stayed false, causing __gxtSyncDomNow to be a no-op.
  const schedule = (globalThis as any).__gxtExternalSchedule;
  if (typeof schedule === 'function') {
    schedule();
  }

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
    return;
  }

  // Collect in the topmost track frame. Untrack frames block propagation.
  if (_frameStack.length > 0) {
    const top = _frameStack[_frameStack.length - 1]!;
    if (top.kind === 'track') {
      top.tags.add(tag);
    }
  }

  // Register in createCache tracker stack. An enclosing untrack frame blocks
  // cache dep collection as well.
  if (_cacheTagTracker.length > 0) {
    let blocked = false;
    for (let i = _frameStack.length - 1; i >= 0; i--) {
      if (_frameStack[i]!.kind === 'untrack') { blocked = true; break; }
    }
    if (!blocked) {
      _cacheTagTracker[_cacheTagTracker.length - 1]!.add(tag);
    }
  }

  if (_debugTransactionActive) {
    // Respect untrack frames: a tag consumed inside untrack is NOT recorded
    // against the debug tracking transaction, so subsequent dirty is legal.
    let blocked = false;
    for (let i = _frameStack.length - 1; i >= 0; i--) {
      if (_frameStack[i]!.kind === 'untrack') { blocked = true; break; }
      if (_frameStack[i]!.kind === 'track') break;
    }
    if (!blocked) _debugTxConsumedTags.add(tag);
  }

  if (typeof tag === 'object' && 'value' in tag && 'dirty' in tag) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    try { (tag as any).value; } catch { /* noop */ }
    return;
  }
  try { validator.consumeTag(tag); } catch { /* noop */ }
}

// ---- Classic tag semantics ----
const TYPE_DIRTYABLE = 0;
const TYPE_UPDATABLE = 1;
const TYPE_COMBINATOR = 2;
const TYPE_CONSTANT = 3;
const TYPE_VOLATILE = 4;
const TYPE_CURRENT = 5;

const INITIAL_REV = 1;
let $REVISION = INITIAL_REV;

export function bump(): number {
  return ++$REVISION;
}

// Allow cycles in tag dependencies - WeakMap to track which tags allow cycles
export const ALLOW_CYCLES = new WeakMap<object, boolean>();

// Debug transaction state for runInTrackingTransaction
let _debugTransactionActive = false;
let _debugTxConsumedTags: Set<any> = new Set();

// A constant tag that never changes
export const CONSTANT_TAG: any = Object.freeze({
  _tagType: TYPE_CONSTANT,
  _isConstTag: true,
  value: INITIAL_REV,
});

// A volatile tag that always needs recomputation
export const VOLATILE_TAG: any = Object.freeze({
  _tagType: TYPE_VOLATILE,
  _isVolatile: true,
});

// Combine multiple tags into a combinator tag.
export function combine(tags: any[]): any {
  if (!Array.isArray(tags) || tags.length === 0) {
    return CONSTANT_TAG;
  }
  const filtered: any[] = [];
  for (const t of tags) {
    if (t === CONSTANT_TAG || t == null) continue;
    filtered.push(t);
  }
  if (filtered.length === 0) return CONSTANT_TAG;
  if (filtered.length === 1) return filtered[0];
  const combinedTag: any = {
    _tagType: TYPE_COMBINATOR,
    _isCombinedTag: true,
    _subtags: filtered,
  };
  Object.defineProperty(combinedTag, 'value', {
    get() { return currentTagRevision(combinedTag); },
  });
  return combinedTag;
}

// Walk the tag graph and return the current max revision.
// Cycles: if encountered, each cycle tag must be marked in ALLOW_CYCLES;
// otherwise throws.
function currentTagRevision(tag: any, visited?: Set<any>): number {
  if (tag == null) return 0;
  if (typeof tag === 'number') return tag;
  if (typeof tag !== 'object') return 0;

  if (visited && visited.has(tag)) {
    if (ALLOW_CYCLES.has(tag)) return 0;
    throw new Error('Error: cycle detected in tag dependency graph');
  }
  if (!visited) visited = new Set();
  visited.add(tag);

  try {
    const type = tag._tagType;

    if (type === TYPE_CONSTANT) return INITIAL_REV;
    if (type === TYPE_VOLATILE) return ++$REVISION; // always newer
    if (type === TYPE_CURRENT) return $REVISION;

    if (type === TYPE_COMBINATOR) {
      let max = INITIAL_REV;
      const subs = tag._subtags as any[];
      for (const s of subs) {
        const r = currentTagRevision(s, visited);
        if (r > max) max = r;
      }
      return max;
    }

    if (type === TYPE_UPDATABLE) {
      let max = tag._rev || INITIAL_REV;
      const sub = tag._subtag;
      if (sub != null) {
        const curSubRev = currentTagRevision(sub, visited);
        if (curSubRev > tag._lastValue && curSubRev > max) {
          max = curSubRev;
        }
      }
      return max;
    }

    if (type === TYPE_DIRTYABLE) {
      return tag._rev || INITIAL_REV;
    }

    // Legacy fallback for GXT-produced tags (from gxtTagFor or meta). Read
    // their dirty revision from our WeakMap populated by dirtyTagFor and
    // walk any registered dep (from updateTag) so CP chain tags invalidate
    // eagerly without the buffering semantics.
    let legacyMax = 0;
    try {
      const rev = _legacyTagRev.get(tag);
      if (typeof rev === 'number') legacyMax = rev;
    } catch { /* noop */ }
    try {
      const dep = _legacyTagDeps.get(tag);
      if (dep != null) {
        const r = currentTagRevision(dep, visited);
        if (r > legacyMax) legacyMax = r;
      }
    } catch { /* noop */ }
    return legacyMax;
  } finally {
    visited.delete(tag);
  }
}

export function validateTag(tag: any, revision?: number): boolean {
  if (!tag) return true;
  if (revision === undefined) return true;
  return currentTagRevision(tag) <= revision;
}

// Update the revision snapshot for a tag (called after observer fires)
export function updateTagRevision(_tag: any): number {
  return $REVISION;
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
export function valueForTag(tag: any): number {
  if (!tag) return 0;
  if (typeof tag === 'number') return tag;
  if (typeof tag === 'object') return currentTagRevision(tag);
  return 0;
}

// Create a basic dirtyable tag. Can be dirtied but NOT updated.
export function createTag(): any {
  return {
    _tagType: TYPE_DIRTYABLE,
    _rev: $REVISION,
  };
}

// Create an updatable tag. Can be dirtied AND updated with a subtag.
export function createUpdatableTag(): any {
  const tag: any = {
    _tagType: TYPE_UPDATABLE,
    _rev: $REVISION,
    _subtag: null,
    _lastValue: INITIAL_REV,
  };
  Object.defineProperty(tag, 'value', {
    get() { return currentTagRevision(tag); },
  });
  tag.dirty = function () { dirtyTag(tag); };
  return tag;
}

// Update an updatable tag to depend on a subtag with buffering.
// Note: we do NOT call currentTagRevision here because it throws on cycles;
// the test explicitly expects cycle detection to happen at validateTag time.
export function updateTag(outer: any, inner: any): void {
  if (!outer || typeof outer !== 'object') {
    throw new Error('Error: Attempted to update a tag that was not updatable');
  }
  // Classic @glimmer/validator strictness: only TYPE_UPDATABLE tags can be
  // updated. Tags without `_tagType` are tolerated for backwards compat with
  // legacy GXT-produced tags — they participate via _legacyTagDeps below.
  const type = outer._tagType;
  if (typeof type === 'number' && type !== TYPE_UPDATABLE) {
    throw new Error('Error: Attempted to update a tag that was not updatable');
  }
  if (type === TYPE_UPDATABLE) {
    // Our updatable tag shape: use buffered _subtag/_lastValue semantics
    // required by the classic validator tests.
    outer._subtag = inner;
    let lastValue = INITIAL_REV;
    if (inner && typeof inner === 'object') {
      if (typeof inner._rev === 'number') {
        lastValue = inner._rev;
      } else if ('value' in inner && typeof (inner as any).value === 'number') {
        lastValue = (inner as any).value;
      }
    }
    outer._lastValue = lastValue;
    return;
  }
  // Legacy path (GXT-produced tag): register eager deps so CP invalidation
  // propagates immediately on any subtag dirty.
  _legacyTagDeps.set(outer, inner);
}

// Map of legacy (GXT-produced) tag → its updateTag() inner tag. Read by
// currentTagRevision's legacy fallback so CPs can invalidate eagerly.
const _legacyTagDeps = new WeakMap<object, any>();

// untrack: push a classic untrack frame AND delegate to gxt's native untrack
// so GXT's own tracker is also suppressed (preserving baseline behavior that
// the old impl relied on).
export function untrack<T>(cb: () => T): T {
  _frameStack.push({ kind: 'untrack' });
  try {
    return gxtUntrack(cb);
  } finally {
    _frameStack.pop();
  }
}

// isConst: true if the tag/cache represents a constant value.
export function isConst(tagOrCache: any): boolean {
  if (tagOrCache === CONSTANT_TAG) return true;
  if (!tagOrCache) return false;
  if (tagOrCache._isCacheObj === true) {
    if (tagOrCache._hasEvaluated !== true) {
      throw new Error(
        'Error: isConst() can only be used on a cache once getValue() has been called at least once'
      );
    }
    return tagOrCache._isConstCache === true;
  }
  if (typeof tagOrCache === 'object' && typeof tagOrCache._tagType === 'number') {
    return tagOrCache._tagType === TYPE_CONSTANT;
  }
  throw new Error(
    `Error: isConst() can only be used on an instance of a cache created with createCache(). Called with: ${String(tagOrCache)}`
  );
}

// Frame-based tracking (manual API used by templates & tests)
export function beginUntrackFrame() {
  _frameStack.push({ kind: 'untrack' });
}

export function endUntrackFrame() {
  const f = _frameStack.pop();
  if (!f || f.kind !== 'untrack') {
    throw new Error('attempted to close an untrack frame, but one was not open');
  }
}

export function beginTrackFrame() {
  _frameStack.push({ kind: 'track', tags: new Set() });
}

export function endTrackFrame(): any {
  const f = _frameStack.pop();
  if (!f || f.kind !== 'track') {
    throw new Error('attempted to close a tracking frame, but one was not open');
  }
  return combine(Array.from(f.tags));
}

// Mark a tag as dirty. Asserts the tag is dirtyable, bumps $REVISION,
// calls the global scheduleRevalidate, bumps the classic bridge.
export function dirtyTag(tag: any): void {
  if (!tag || typeof tag !== 'object') {
    throw new Error('Error: Attempted to dirty a tag that was not dirtyable');
  }
  const type = tag._tagType;
  if (type !== TYPE_DIRTYABLE && type !== TYPE_UPDATABLE) {
    throw new Error('Error: Attempted to dirty a tag that was not dirtyable');
  }
  if (_debugTransactionActive && _debugTxConsumedTags.has(tag)) {
    throw new Error(
      'Error: Assertion Failed: You attempted to update `undefined`, but it had already been consumed in this tracking transaction'
    );
  }
  $REVISION++;
  tag._rev = $REVISION;
  globalRevisionCounter++;
  _bumpClassicBridge();
  try {
    if (typeof _globalContext.scheduleRevalidate === 'function') {
      _globalContext.scheduleRevalidate();
    }
  } catch { /* noop */ }
  const syncNow = (globalThis as any).__gxtSyncDomNow;
  if (typeof syncNow === 'function') {
    syncNow();
  }
}

// Debug utility for tags
export function debug(tag: any, label?: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Tag Debug${label ? `: ${label}` : ''}]`, tag);
  }
}

// runInTrackingTransaction: runs fn in a debug transaction where dirtying a
// tag previously consumed in the same transaction throws.
export function runInTrackingTransaction<T>(fn: () => T, _debuggingContext?: string): T {
  const wasActive = _debugTransactionActive;
  const prevConsumed = _debugTxConsumedTags;
  if (!wasActive) {
    _debugTransactionActive = true;
    _debugTxConsumedTags = new Set();
  }
  try {
    return fn();
  } finally {
    if (!wasActive) {
      _debugTransactionActive = false;
      _debugTxConsumedTags = prevConsumed;
    }
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
