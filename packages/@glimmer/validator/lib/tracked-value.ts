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

  /**
   * `get`, `set`, `update` and `freeze` are bound to the instance,
   * so that they can be detached from it.
   *
   * Each one is made the first time that it is read,
   * so an instance that only uses `value` makes no function.
   *
   * Each one can be assigned, for example by a test that replaces it.
   */
  #get: (() => Value) | undefined;
  #set: ((value: Value) => boolean) | undefined;
  #update: ((updater: (value: Value) => Value) => void) | undefined;
  #freeze: (() => void) | undefined;

  /**
   * The `@tracked` decorator passes the tag that the tag registry has for the field.
   * `tagFor` and `dirtyTagFor` then work on the tag of the value.
   */
  constructor(value: Value, options: ReactiveOptions<Value>, tag?: UpdatableTag) {
    /**
     * If we let V8 try to completely optimize TrackedValue for
     *   for each type of `value`,
     *     that performs worse than making V8 only use one internal
     *     internal version of the class for each type of `value`.
     *
     * The first value of another kind makes V8 throw away
     *   the optimized code that reads the field.
     *
     * The field starts as `undefined`,
     *   so a number here makes it general from the first instance.
     */
    this.#value = 0 as Value;
    this.#value = value;
    this.#options = options;
    this.#tag = tag === undefined ? createUpdatableTag() : tag;
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
    let set = this.#set;

    if (set === undefined) {
      this.#write(value);
    } else {
      set(value);
    }
  }

  /**
   * Function short-hand for reading `value`.
   */
  get get(): () => Value {
    return (this.#get ??= () => this.value);
  }

  /**
   * Function short-hand for assigning `value`.
   *
   * Returns `true` if the value changed (and consumers were notified),
   * `false` if the new value was equal to the current one.
   */
  get set(): (value: Value) => boolean {
    return (this.#set ??= (value) => this.#write(value));
  }

  /**
   * Update the value based on the current value, without consuming it.
   */
  get update(): (updater: (value: Value) => Value) => void {
    return (this.#update ??= (updater) => {
      this.#write(updater(this.#value));
    });
  }

  /**
   * Prevents further updates, making the TrackedValue behave as a
   * ReadOnlyReactive.
   */
  get freeze(): () => void {
    return (this.#freeze ??= () => {
      this.#isFrozen = true;
    });
  }

  #write(value: Value): boolean {
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
  }
}

const DEFAULT_OPTIONS: ReactiveOptions<unknown> = Object.freeze({
  equals: Object.is,
  description: undefined,
});

export function trackedValue<Value>(
  value: Value,
  options?: { equals?: (a: Value, b: Value) => boolean; description?: string }
): TrackedValue<Value> {
  if (options === undefined) {
    return new TrackedValue(value, DEFAULT_OPTIONS);
  }

  return new TrackedValue(value, {
    equals: options.equals ?? Object.is,
    description: options.description,
  });
}
