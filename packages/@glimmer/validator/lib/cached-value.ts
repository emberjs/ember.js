import type { ReadOnlyReactive } from './tracked-value';

import { type Cache, createCache, getValue } from './tracking';

/**
 * A cached, read-only reactive value.
 *
 * Reading `value` entangles with the current tracking frame, and only
 * re-invokes the wrapped function when tracked state it previously read has
 * changed.
 */
export class CachedValue<Value = unknown> implements ReadOnlyReactive<Value> {
  readonly #cache: Cache<Value>;

  constructor(fn: () => Value, options?: { description?: string }) {
    this.#cache = createCache(fn, options?.description);
  }

  /**
   * The underlying value, re-computed only when tracked state read by the
   * wrapped function has changed.
   */
  get value(): Value {
    return getValue(this.#cache) as Value;
  }

  /**
   * Function short-hand for reading `value`.
   */
  get = (): Value => {
    return this.value;
  };
}

export function cachedValue<Value>(
  fn: () => Value,
  options?: { description?: string }
): CachedValue<Value> {
  return new CachedValue(fn, options);
}
