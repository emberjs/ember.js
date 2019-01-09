import {
  OpaqueIterator,
  IterationItem,
  AbstractIterable,
  Tag,
  Reference,
} from '@glimmer/reference';
import { Option } from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { isDict } from '@glimmer/util';

export type KeyFor<T> = (item: unknown, index: T) => string;

interface ForEach<T> {
  forEach(callback: (input: T) => void): void;
}

function isForEach(v: unknown): v is ForEach<unknown> {
  return isDict(v) && typeof v.forEach === 'function';
}

export class Iterable
  implements
    AbstractIterable<
      unknown,
      unknown,
      IterationItem<unknown, unknown>,
      UpdatableReference<unknown>,
      UpdatableReference<unknown>
    > {
  public tag: Tag;
  private ref: Reference<unknown>;
  private keyFor: KeyFor<unknown>;

  constructor(ref: Reference<unknown>, keyFor: KeyFor<unknown>) {
    this.tag = ref.tag;
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate(): OpaqueIterator {
    let { ref, keyFor } = this;

    let iterable = ref.value();

    if (Array.isArray(iterable)) {
      return iterable.length > 0 ? new ArrayIterator(iterable, keyFor) : EMPTY_ITERATOR;
    } else if (iterable === undefined || iterable === null) {
      return EMPTY_ITERATOR;
    } else if (isForEach(iterable)) {
      let array: unknown[] = [];
      iterable.forEach(item => array.push(item));
      return array.length > 0 ? new ArrayIterator(array, keyFor) : EMPTY_ITERATOR;
    } else if (isDict(iterable)) {
      let keys = Object.keys(iterable);

      if (keys.length > 0) {
        let values: unknown[] = [];

        for (let i = 0; i < keys.length; i++) {
          let key = keys[i];
          values[i] = iterable[key];
        }

        return new ObjectKeysIterator(keys, values, keyFor);
      } else {
        return EMPTY_ITERATOR;
      }
    } else {
      throw new Error(`Don't know how to {{#each ${iterable}}}`);
    }
  }

  valueReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.update(item.value);
  }

  memoReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.update(item.memo);
  }
}

class EmptyIterator implements OpaqueIterator {
  isEmpty(): boolean {
    return true;
  }

  next(): IterationItem<unknown, unknown> {
    throw new Error(`Cannot call next() on an empty iterator`);
  }
}

class ObjectKeysIterator implements OpaqueIterator {
  private keys: string[];
  private values: unknown[];
  private keyFor: KeyFor<string>;
  private position = 0;

  constructor(keys: string[], values: unknown[], keyFor: KeyFor<string>) {
    this.keys = keys;
    this.values = values;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.keys.length === 0;
  }

  next(): Option<IterationItem<unknown, string>> {
    let { position, keys, values, keyFor } = this;

    if (position >= keys.length) return null;

    let value = values[position];
    let memo = keys[position];
    let key = keyFor(value, memo);

    this.position++;

    return { key, value, memo };
  }
}

class ArrayIterator implements OpaqueIterator {
  private array: unknown[];
  private keyFor: KeyFor<number>;
  private position = 0;

  constructor(array: unknown[], keyFor: KeyFor<number>) {
    this.array = array;
    this.keyFor = keyFor;
  }

  isEmpty(): boolean {
    return this.array.length === 0;
  }

  next(): Option<IterationItem<unknown, number>> {
    let { position, array, keyFor } = this;

    if (position >= array.length) return null;

    let value = array[position];
    let key = keyFor(value, position);
    let memo = position;

    this.position++;

    return { key, value, memo };
  }
}

const EMPTY_ITERATOR = new EmptyIterator();
