import type { UpdatableTag } from '@glimmer/interfaces';

import { consumeTag } from './tracking';
import { createUpdatableTag, DIRTY_TAG } from './validators';
import type { ReactiveOptions } from './collections/types';

class Cell<Value> {
  #options: ReactiveOptions<Value>;
  #value: Value;
  readonly #tag: UpdatableTag;

  constructor(value: Value, options: ReactiveOptions<Value>) {
    this.#value = value;
    this.#options = options;
    this.#tag = createUpdatableTag();
  }

  get current() {
    consumeTag(this.#tag);

    return this.#value;
  }

  read(): Value {
    consumeTag(this.#tag);

    return this.#value;
  }

  set(value: Value): boolean {
    if (this.#options.equals?.(this.#value, value)) {
      return false;
    }

    this.#value = value;

    DIRTY_TAG(this.#tag);

    return true;
  }

  update(updater: (value: Value) => Value): void {
    this.set(updater(this.#value));
  }

  freeze(): void {
    throw new Error(`Not Implemented`);
  }
}

export function cell<T>(
  value: T,

  options?: { equals?: (a: T, b: T) => boolean; description?: string }
) {
  return new Cell(value, {
    equals: options?.equals ?? Object.is,
    description: options?.description,
  });
}
