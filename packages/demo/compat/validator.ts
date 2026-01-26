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

export const {
  dirtyTagFor,
  tagFor,
  isTracking,
  tagMetaFor,
  track,
  trackedData,
  untrack: gxtUntrack,
  beginTrackFrame: gxtBeginTrackFrame,
  endTrackFrame: gxtEndTrackFrame,
  beginUntrackFrame: gxtBeginUntrackFrame,
  endUntrackFrame: gxtEndUntrackFrame,
} = validator;
export const { getValue, createCache } = caching;

export function consumeTag(tag: any) {
  if (!tag) {
    // Empty tags can be safely ignored
    return;
  }
  return validator.consumeTag(tag);
}

// A tag that represents the current revision - updates on every access
export const CURRENT_TAG = formula(() => {
  return Date.now() + Math.random();
}, 'CURRENT_TAG');

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

// Allow cycles in tag dependencies
export const ALLOW_CYCLES = true;

// Combine multiple tags into a single computed tag
export function combine(tags: any[]) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return CONSTANT_TAG;
  }
  return formula(() => {
    return tags.map((t) => (typeof t === 'object' && t !== null ? t.value : t));
  }, 'combine');
}

// Track validated tags for memoization
const validated = new WeakSet<object>();

export function validateTag(tag: any, revision?: number): boolean {
  if (!tag) {
    return true; // Null tags are always valid
  }
  // Formula-based tags are always valid in gxt
  if ('fn' in tag) {
    return true;
  }
  // For revision-based validation
  if (revision !== undefined && tag.revision !== undefined) {
    return tag.revision === revision;
  }
  // Memoize validation results
  if (!validated.has(tag)) {
    validated.add(tag);
    return false;
  }
  return true;
}

// Reset tracking state (used in testing)
let trackingStack: any[] = [];

export function resetTracking() {
  trackingStack = [];
}

// Special revision values
export const COMPUTE = 13;
export const INITIAL = 31;

// Revision cache to avoid triggering reactivity cycles
const revisionCache = new WeakMap<object, number>();
let globalRevision = 0;

// Get the current revision value for a tag WITHOUT triggering reactivity
export function valueForTag(tag: any): number {
  if (!tag) return 0;
  if (typeof tag === 'number') return tag;

  // Check cache first
  if (typeof tag === 'object') {
    const cached = revisionCache.get(tag);
    if (cached !== undefined) {
      return cached;
    }
    // Generate and cache a revision
    const rev = ++globalRevision;
    revisionCache.set(tag, rev);
    return rev;
  }

  return Date.now();
}

// Create an updatable tag
export function createUpdatableTag() {
  const value = cell(0, 'updatableTag');
  return {
    get value() {
      return value.value;
    },
    dirty() {
      value.value = Date.now();
    },
  };
}

// Update a tag to depend on another tag
export function updateTag(outer: any, inner: any) {
  if (outer && inner && typeof outer.update === 'function') {
    outer.update(inner);
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

// Mark a tag as dirty
export function dirtyTag(tag: any) {
  if (tag && typeof tag.dirty === 'function') {
    tag.dirty();
  }
}

// Debug utility for tags
export function debug(tag: any, label?: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Tag Debug${label ? `: ${label}` : ''}]`, tag);
  }
}

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
