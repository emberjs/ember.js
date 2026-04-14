// Import from glimmer-compatibility to avoid gxt compiler conflicts
import { validator, caching, storage } from '@lifeart/gxt/glimmer-compatibility';
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
  }

  // Snapshot the global revision counter AFTER running the callback.
  // Any future bump means a dependency changed.
  const snapshotRevision = globalRevisionCounter;

  // Return a tag that uses the global revision counter to detect changes.
  // consumed tags from explicit consumeTag calls are also tracked.
  const tag = {
    _isTrackTag: true,
    _snapshotRevision: snapshotRevision,
    _consumed: consumed.size > 0 ? Array.from(consumed) : null,
    get value() {
      return globalRevisionCounter;
    },
  };

  return tag;
}

// Custom isTracking that also returns true when inside our custom track()
export function isTracking(): boolean {
  if (_trackingTagStack && _trackingTagStack.length > 0) return true;
  return gxtIsTracking();
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

    get value(): T {
      if (!_isValid()) {
        const wasInitialized = _initialized;
        const oldValue = _lastValue;
        _lastValue = _evaluate();
        _initialized = true;
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
      // Store consumed tags and snapshots
      _consumedTags = Array.from(consumed);
      _consumedTagSnapshots = _consumedTags.map(t => {
        if (t && typeof t === 'object' && 'value' in t) {
          try { return t.value; } catch { return undefined; }
        }
        return undefined;
      });
      // Store nested caches
      _nestedCaches = Array.from(nested);
      _nestedCacheRevisions = _nestedCaches.map(c => c._revision || 0);
      // If fn() consumed no tags and no nested caches, it's constant.
    }
  }

  function _isValid(): boolean {
    if (!_initialized) return false;
    // Check consumed tags (from consumeTag calls during fn())
    for (let i = 0; i < _consumedTags.length; i++) {
      const tag = _consumedTags[i];
      if (tag && typeof tag === 'object' && 'value' in tag) {
        try {
          if (tag.value !== _consumedTagSnapshots[i]) return false;
        } catch {
          return false;
        }
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
    }
  };
}

// Global revision counter - this gets bumped whenever any tag is dirtied
let globalRevisionCounter = 0;

// CURRENT_TAG is a special tag that represents the current global revision
// It's used by the observer system to detect if any tags have changed
const currentTagCell = cell(globalRevisionCounter, 'CURRENT_TAG');
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
  return result;
}

export function consumeTag(tag: any) {
  if (!tag) {
    // Empty tags can be safely ignored
    return;
  }

  // Collect this tag in the current track() frame if active
  if (_trackingTagStack && _trackingTagStack.length > 0) {
    _trackingTagStack[_trackingTagStack.length - 1]!.add(tag);
  }

  // Register in createCache tracker stack for fine-grained invalidation
  if (_cacheTagTracker.length > 0) {
    _cacheTagTracker[_cacheTagTracker.length - 1]!.add(tag);
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

// A volatile tag that always needs recomputation
export const VOLATILE_TAG = formula(() => Date.now() + Math.random(), 'VOLATILE_TAG');

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

// Combine multiple tags into a single computed tag
export function combine(tags: any[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return CONSTANT_TAG;
  }
  const combinedTag = formula(() => {
    return tags.map((t) => (typeof t === 'object' && t !== null ? t.value : t));
  }, 'combine');

  // Store the constituent tags so we can check if any were dirtied
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
function currentTagRevision(tag: any, visited = new Set<any>()): number {
  if (!tag || typeof tag !== 'object') return 0;
  if (visited.has(tag)) return 0;
  visited.add(tag);

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
      const r = currentTagRevision(c, visited);
      if (r > max) max = r;
    }
  }

  // Check updateTag dependencies (e.g., autoComputed links propertyTag → trackTag)
  const deps = updatableTagDependencies.get(tag);
  if (deps) {
    for (const d of deps) {
      const r = currentTagRevision(d, visited);
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
}

export function validateTag(tag: any, revision?: number): boolean {
  if (!tag) {
    return true; // Null tags are always valid
  }

  // If no revision provided, always consider valid
  if (revision === undefined) {
    return true;
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
  return {
    get value() {
      return value.value;
    },
    dirty() {
      value.value = ++_updatableTagRevision;
    },
  };
}

// Update a tag to depend on another tag (or array of tags)
// This is used by computed properties to link the property tag to its dependency tags
export function updateTag(outer: any, inner: any) {
  if (!outer || !inner) return;

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

// Use gxt's untrack implementation for proper integration
export function untrack<T>(cb: () => T): T {
  return gxtUntrack(cb);
}

// Check if a tag represents a constant value
export function isConst(tag: any): boolean {
  return tag === CONSTANT_TAG || (tag && tag.isConst === true);
}

// Frame-based tracking - delegate to gxt
export function beginUntrackFrame() {
  gxtBeginUntrackFrame();
}

export function endUntrackFrame() {
  gxtEndUntrackFrame();
}

export function beginTrackFrame() {
  gxtBeginTrackFrame();
}

export function endTrackFrame() {
  gxtEndTrackFrame();
}

// Create a basic tag
export function createTag() {
  return createUpdatableTag();
}

// Mark a tag as dirty and flush DOM updates synchronously.
// This is needed because helper.recompute() calls dirtyTag() via join(),
// and tests expect the DOM to be updated synchronously after recompute().
export function dirtyTag(tag: any) {
  if (tag && typeof tag.dirty === 'function') {
    tag.dirty();
    // Bump global revision so track tags also detect this change
    globalRevisionCounter++;
    _bumpClassicBridge();
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
// runInTrackingTransaction wraps a function to catch tracking-related errors
export function runInTrackingTransaction<T>(fn: () => T, debuggingContext?: string): T {
  // In non-debug mode, just run the function directly
  // The tracking transaction is meant to catch autotracking assertions
  // For GXT compatibility, we just execute directly
  return fn();
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
  const tags = new Map<string | symbol, ReturnType<typeof cell>>();

  return new Proxy(obj, {
    get(target, prop, receiver) {
      // Consume the tag for this property
      let tag = tags.get(prop);
      if (!tag) {
        tag = cell(target[prop as keyof T], `trackedObject.${String(prop)}`);
        tags.set(prop, tag);
        values.set(prop, target[prop as keyof T]);
      }
      return tag.value;
    },
    set(target, prop, value, receiver) {
      let tag = tags.get(prop);
      if (!tag) {
        tag = cell(value, `trackedObject.${String(prop)}`);
        tags.set(prop, tag);
      } else {
        tag.value = value;
      }
      values.set(prop, value);
      target[prop as keyof T] = value;
      return true;
    },
  });
}
