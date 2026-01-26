import { formula, cell } from '@lifeart/gxt';
import { validator, caching } from '@lifeart/gxt/glimmer-compatibility';

export const { dirtyTagFor, tagFor, isTracking, tagMetaFor, track, trackedData } = validator;
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

// Get the current revision value for a tag
export function valueForTag(tag: any): number {
  if (!tag) return 0;
  if (typeof tag === 'number') return tag;
  if ('value' in tag) return tag.value;
  if ('revision' in tag) return tag.revision;
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

// TODO: untrack is breaking reactivity in some cases
// This is a known issue that needs investigation
export function untrack<T>(cb: () => T): T {
  // For now, just execute the callback
  // In a full implementation, this would pause tracking
  return cb();
}

// Check if a tag represents a constant value
export function isConst(tag: any): boolean {
  return tag === CONSTANT_TAG || (tag && tag.isConst === true);
}

// Frame-based tracking for nested computations
export function beginUntrackFrame() {
  trackingStack.push({ untrack: true });
}

export function endUntrackFrame() {
  trackingStack.pop();
}

export function beginTrackFrame() {
  trackingStack.push({ track: true });
}

export function endTrackFrame() {
  return trackingStack.pop();
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
