import type { UpdatableTag } from '@glimmer/interfaces';

import type { ReactiveOptions } from './collections/types';

import { consumeTag } from './tracking';
import { createUpdatableTag, DIRTY_TAG } from './validators';

/**
 * A mutable reactive value.
 *
 * Reading `value` consumes the underlying tag (entangling with any active
 * tracking frame), and writing `value` dirties it.
 */
export interface Reactive<Value> {
  value: Value;
}

/**
 * A reactive value that can only be read.
 */
export interface ReadOnlyReactive<Value> extends Reactive<Value> {
  readonly value: Value;
}

export class TrackedValue<Value = unknown> implements Reactive<Value> {
  #isFrozen = false;
  #value: Value;
  readonly #options: ReactiveOptions<Value>;
  readonly #tag: UpdatableTag;

  constructor(value: Value, options: ReactiveOptions<Value>) {
    this.#value = value;
    this.#options = options;
    this.#tag = createUpdatableTag();
  }

  /**
   * The underlying value.
   *
   * Reading entangles with the current tracking frame, and writing notifies
   * consumers (unless the configured `equals` deems the new value equal to
   * the current one).
   */
  get value(): Value {
    consumeTag(this.#tag);

    return this.#value;
  }

  set value(value: Value) {
    this.set(value);
  }

  /**
   * Function short-hand for reading `value`.
   */
  get = (): Value => {
    return this.value;
  };

  /**
   * Function short-hand for assigning `value`.
   *
   * Returns `true` if the value changed (and consumers were notified),
   * `false` if the new value was equal to the current one.
   */
  set = (value: Value): boolean => {
    if (this.#isFrozen) {
      throw new Error(
        `Cannot update a frozen TrackedValue${
          this.#options.description ? ` (\`${this.#options.description}\`)` : ''
        }`
      );
    }

    if (this.#options.equals(this.#value, value)) {
      return false;
    }

    this.#value = value;

    DIRTY_TAG(this.#tag);

    return true;
  };

  /**
   * Update the value based on the current value, without consuming it.
   */
  update = (updater: (value: Value) => Value): void => {
    this.set(updater(this.#value));
  };

  /**
   * Prevents further updates, making the TrackedValue behave as a
   * ReadOnlyReactive.
   */
  freeze = (): void => {
    this.#isFrozen = true;
  };
}

export function trackedValue<Value>(
  value: Value,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): TrackedValue<Value> {
  return new TrackedValue(value, {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
