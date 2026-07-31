import type { ReactiveOptions } from './collections/types';
import type { ReadOnlyReactive } from './tracked-value';

import { type Cache, createCache, getValue } from './tracking';

/**
 * A memoized, read-only reactive value.
 *
 * Reading `value` entangles with the current tracking frame, and only
 * re-invokes the wrapped function when tracked state it previously read has
 * changed.
 */
export class CachedValue<Value = unknown> implements ReadOnlyReactive<Value> {
  #hasPrevious = false;
  #previous: Value | undefined;
  readonly #cache: Cache<Value>;

  constructor(fn: () => Value, options: ReactiveOptions<Value>) {
    this.#cache = createCache(() => {
      let next = fn();

      if (this.#hasPrevious && options.equals(this.#previous as Value, next)) {
        return this.#previous as Value;
      }

      this.#hasPrevious = true;
      this.#previous = next;

      return next;
    }, options.description);
  }

  /**
   * The underlying value.
   *
   * Reading entangles with the current tracking frame. When a re-computation
   * produces a value the configured `equals` deems equal to the previous one,
   * the previous value (and its identity) is retained.
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
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): CachedValue<Value> {
  return new CachedValue(fn, {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
