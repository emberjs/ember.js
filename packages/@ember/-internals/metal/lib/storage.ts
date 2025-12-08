import type { UpdatableTag } from '@glimmer/interfaces';

import { consumeTag } from './tracking';
import { createUpdatableTag, DIRTY_TAG } from './validators';
import { assert } from '@ember/debug';

const SET = Symbol.for('TrackedStorage.set');
const READ = Symbol.for('TrackedStorage.read');

function tripleEq<Value>(a: Value, b: Value): boolean {
  return a === b;
}

class Storage<Value> {
  #tag: UpdatableTag;
  #value: Value;
  #lastValue: Value;
  #isEqual: (a: Value, b: Value) => boolean;

  get #current() {
    consumeTag(this.#tag);
    return this.#value;
  }
  set #current(value) {
    if (this.#isEqual(this.#value, this.#lastValue)) {
      return;
    }

    this.#value = this.#lastValue = value;

    DIRTY_TAG(this.#tag);
  }

  constructor(initialValue: Value, isEqual?: (a: Value, b: Value) => boolean) {
    this.#tag = createUpdatableTag();
    this.#value = this.#lastValue = initialValue;
    this.#isEqual = isEqual ?? tripleEq;
  }

  [READ]() {
    return this.#current;
  }

  [SET](value: Value) {
    this.#current = value;
  }
}

export function createStorage<Value>(
  initialValue: Value,
  isEqual?: (oldValue: Value, newValue: Value) => boolean
): Storage<Value> {
  assert(
    'the second parameter to `createStorage` must be an equality function or undefined',
    isEqual === undefined || typeof isEqual === 'function'
  );

  return new Storage(initialValue, isEqual);
}

export function getValue<Value>(storage: Storage<Value>): Value {
  assert(
    'getValue must be passed a tracked store created with `createStorage`.',
    storage instanceof Storage
  );

  return storage[READ]();
}

export function setValue<Value>(storage: Storage<Value>, value: Value): void {
  assert(
    'setValue must be passed a tracked store created with `createStorage`.',
    storage instanceof Storage
  );

  storage[SET](value);
}
