// Import from glimmer-compatibility to avoid gxt compiler conflicts
import { validator, caching, storage } from '@lifeart/gxt/glimmer-compatibility';

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
  isTracking,
  tagMetaFor,
  track,
  // trackedData - we provide our own implementation below to avoid infinite loops
  untrack: gxtUntrack,
  beginTrackFrame: gxtBeginTrackFrame,
  endTrackFrame: gxtEndTrackFrame,
  beginUntrackFrame: gxtBeginUntrackFrame,
  endUntrackFrame: gxtEndUntrackFrame,
} = validator;

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
export const { getValue, createCache } = caching;

// Custom trackedData implementation that avoids infinite loops
// The GXT version creates a formula that reads obj[key], which triggers the
// tracked getter again. Our version uses internal WeakMap storage instead.
const trackedDataStorage = new WeakMap<object, Map<string | symbol, ReturnType<typeof createCell>>>();

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

// Wrap dirtyTagFor to also bump the global revision AND mark the specific tag as dirty
const gxtDirtyTagFor = validator.dirtyTagFor;
export function dirtyTagFor(obj: any, key: any) {
  // Convert Symbol keys to safe string representation
  const safeKey = typeof key === 'symbol' ? (key.description || String(key)) : key;

  // Bump global revision first
  globalRevisionCounter++;
  currentTagCell.value = globalRevisionCounter;

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
  try {
    // Ensure obj has a constructor for GXT's debug label
    if (obj && typeof obj === 'object' && !obj.constructor) {
      Object.defineProperty(obj, 'constructor', {
        value: Object, writable: true, configurable: true, enumerable: false,
      });
    }
    return gxtDirtyTagFor(obj, safeKey);
  } catch {
    // GXT's dirtyTagFor may fail for objects without constructor
  }
}

export function consumeTag(tag: any) {
  if (!tag) {
    // Empty tags can be safely ignored
    return;
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

// Track tag revisions for proper validation
// Use a simple approach: track when tags were last snapshot and when they were dirtied
const tagLastSnapshotRevision = new WeakMap<object, number>();
let globalTagRevision = 0;

// Track dirty revisions - when a tag was last dirtied
const tagDirtyRevision = new WeakMap<object, number>();

// Get the revision for a tag (for storing as lastRevision)
function getTagSnapshotRevision(tag: any): number {
  if (!tagLastSnapshotRevision.has(tag)) {
    tagLastSnapshotRevision.set(tag, ++globalTagRevision);
  }
  return tagLastSnapshotRevision.get(tag)!;
}

// Mark a tag as dirtied at the current revision
function markTagDirty(tag: any): void {
  const rev = ++globalTagRevision;
  tagDirtyRevision.set(tag, rev);
  // Also update the snapshot to the dirty revision
  tagLastSnapshotRevision.set(tag, rev);
}

// Check if a tag has changed since the given revision
function hasTagChangedSinceRevision(tag: any, sinceRevision: number, visited = new Set()): boolean {
  // Prevent infinite loops in circular dependencies
  if (visited.has(tag)) {
    return false;
  }
  visited.add(tag);

  // Check if the tag itself was dirtied
  const dirtyRev = tagDirtyRevision.get(tag);
  if (dirtyRev !== undefined && dirtyRev > sinceRevision) {
    return true;
  }

  // Check if this is a combined tag and any constituent was dirtied
  const constituents = combinedTagConstituents.get(tag);
  if (constituents) {
    for (const constituent of constituents) {
      if (hasTagChangedSinceRevision(constituent, sinceRevision, visited)) {
        return true;
      }
    }
  }

  // Check if this tag has dependencies via updateTag (for computed properties)
  const dependencies = updatableTagDependencies.get(tag);
  if (dependencies) {
    for (const dep of dependencies) {
      if (hasTagChangedSinceRevision(dep, sinceRevision, visited)) {
        return true;
      }
    }
  }

  return false;
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
  // CURRENT_TAG is a cell whose value is the global revision counter
  if (tag === CURRENT_TAG) {
    // Valid if current tag value is less than or equal to the captured revision
    return tag.value <= revision;
  }

  // Check if the tag has changed since the given revision
  return !hasTagChangedSinceRevision(tag, revision);
}

// Update the revision snapshot for a tag (called after observer fires)
export function updateTagRevision(tag: any): number {
  const newRevision = ++globalTagRevision;
  tagLastSnapshotRevision.set(tag, newRevision);
  return newRevision;
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
// This returns the revision number that can be used with validateTag later
export function valueForTag(tag: any): number {
  if (!tag) return 0;
  if (typeof tag === 'number') return tag;

  // Special handling for CURRENT_TAG - it directly contains the global revision
  if (tag === CURRENT_TAG) {
    return tag.value;
  }

  // For object tags (gxt cells), get or create snapshot revision
  if (typeof tag === 'object') {
    return getTagSnapshotRevision(tag);
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
