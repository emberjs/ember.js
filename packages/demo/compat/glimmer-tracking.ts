/**
 * GXT-compatible @glimmer/tracking replacement
 *
 * Uses GXT's cell-based reactivity instead of Glimmer VM's tag system.
 * This eliminates backtracking assertions and makes @tracked work
 * natively with GXT's formula tracking.
 */
import { trackedData } from '@glimmer/validator';

/**
 * @tracked decorator — makes a class property reactive.
 * Uses trackedData from our @glimmer/validator compat (which uses GXT cells).
 */
export function tracked(target: object, key: string, desc?: PropertyDescriptor): any {
  // Get the trackedData getter/setter for this key
  // decorator-transforms passes { initializer: () => value } instead of { value }
  const descAny = desc as any;
  const initializer = descAny?.initializer
    ? () => descAny.initializer.call(undefined)
    : (desc && 'value' in desc ? () => desc.value : undefined);
  const { getter, setter } = trackedData<any, string>(key, initializer);

  return {
    enumerable: true,
    configurable: true,
    get(this: object) {
      return getter(this);
    },
    set(this: object, value: any) {
      // GXT backtracking detection for @tracked properties
      const checkBacktracking = (globalThis as any).__gxtCheckBacktracking;
      if (typeof checkBacktracking === 'function') {
        checkBacktracking(this, key);
      }
      setter(this, value);
    },
  };
}

/**
 * @cached decorator — caches the result of a getter until tracked deps change.
 * Uses GXT's formula (MergedCell) for caching.
 */
export function cached(_target: object, key: string, desc: PropertyDescriptor): PropertyDescriptor {
  const { get: origGetter } = desc;
  if (!origGetter) {
    throw new Error(`@cached can only be used on getters, but ${key} is not a getter`);
  }
  const cacheMap = new WeakMap<object, any>();

  return {
    ...desc,
    get(this: object) {
      if (!cacheMap.has(this)) {
        // Use createCache for proper tracking
        const cache = createCache(() => origGetter.call(this));
        cacheMap.set(this, cache);
      }
      return getValue(cacheMap.get(this));
    },
  };
}

/**
 * setPropertyDidChange — no-op in GXT mode.
 * Ember uses this to hook into property changes, but GXT handles
 * reactivity through cells directly.
 */
export function setPropertyDidChange(_callback: () => void): void {
  // no-op — GXT cells handle change propagation
}

// Re-export cache primitives for @glimmer/tracking/primitives/cache
import { createCache, getValue } from '@glimmer/validator';
export { createCache, getValue };

/**
 * isConst — checks if a cache is constant (never changes).
 */
export function isConst(cache: any): boolean {
  return cache?.tag?.isConst ?? false;
}
