/**
 * GXT-compatible @glimmer/tracking replacement
 *
 * Uses GXT's cell-based reactivity instead of Glimmer VM's tag system.
 * This eliminates backtracking assertions and makes @tracked work
 * natively with GXT's formula tracking.
 */
import { trackedData, consumeTag, tagFor, dirtyTagFor } from '@glimmer/validator';
import { getGxtRenderer } from './gxt-bridge';

/**
 * @tracked decorator — makes a class property reactive.
 * Uses trackedData from our @glimmer/validator compat (which uses GXT cells).
 */
export function tracked(target: object, key: string, desc?: PropertyDescriptor): any {
  // decorator-transforms passes { initializer: () => value } instead of { value }
  const descAny = desc as any;
  const initializer = descAny?.initializer
    ? () => descAny.initializer.call(undefined)
    : desc && 'value' in desc
      ? () => desc.value
      : undefined;
  const { getter, setter } = trackedData<any, string>(key, initializer);

  const trackedGet: any = function (this: object) {
    const value = getter(this);
    // Consume the property tag so createCache tracking captures this
    // dependency. Without this, @cached getters that read @tracked
    // properties from @glimmer/tracking won't invalidate.
    consumeTag(tagFor(this, key));
    return value;
  };
  // Mark this getter so createRenderContext can detect @tracked
  // properties and avoid installing arg-cell descriptors that would
  // shadow them (see tracked-args-proxy test).
  trackedGet.__isTrackedGetter = true;

  const trackedSet: any = function (this: object, value: any) {
    // The bridge method is optional because classic builds never install it.
    getGxtRenderer()?.backtracking.checkBacktracking?.(this, key);
    setter(this, value);
    // Dirty the property tag so createCache invalidates.
    dirtyTagFor(this, key);
    // Mark a sync as pending so run() flushes DOM updates.
    getGxtRenderer()?.compilePipeline.setPendingSync?.(true);
    // Notify GXT for cross-object reactivity, unless a render is in progress.
    // Both bridge methods are optional (classic builds never install them).
    const _cp = getGxtRenderer()?.compilePipeline;
    const _isCR = _cp?.isCurrentlyRendering;
    if (!(typeof _isCR === 'function' ? _isCR() : false)) {
      // Suppression (the `withTriggerSuppressed(fn)` frame) is handled inside
      // `_gxtTriggerReRender` in compile.ts.
      _cp?.triggerReRender?.(this, key);
    }
  };
  trackedSet.__isTrackedSetter = true;

  return {
    enumerable: true,
    configurable: true,
    get: trackedGet,
    set: trackedSet,
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

// The cache primitives of `@glimmer/tracking/primitives/cache` are the
// validator's, as upstream's `primitives/cache` re-exports them.
import { createCache, getValue } from '@glimmer/validator';
export { createCache, getValue, isConst } from '@glimmer/validator';
