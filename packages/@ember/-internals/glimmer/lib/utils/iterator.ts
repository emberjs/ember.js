import type EmberArray from '@ember/array';
import { isObject } from '@ember/-internals/utils/lib/spec';
import type { Nullable } from '@ember/-internals/utility-types';
import type { IteratorDelegate } from '@glimmer/reference/lib/iterable';
import type { NativeArray } from '@ember/array';
import { hooks, iteratorExtensions } from '../hooks';

export default function toIterator(iterable: unknown): Nullable<IteratorDelegate> {
  for (let extension of iteratorExtensions) {
    let result = extension(iterable);

    if (result !== undefined) {
      return result;
    }
  }

  return toEachIterator(iterable);
}

function toEachIterator(iterable: unknown) {
  if (!isObject(iterable)) {
    return null;
  }

  if (Array.isArray(iterable)) {
    return ArrayIterator.from(iterable);
  } else if (hooks.isEmberArray(iterable)) {
    return EmberArrayIterator.from(iterable as EmberArray<unknown>);
  } else if (isNativeIterable(iterable)) {
    return ArrayLikeNativeIterator.from(iterable);
  } else if (hasForEach(iterable)) {
    return ArrayIterator.fromForEachable(iterable);
  } else {
    return null;
  }
}

export abstract class BoundedIterator implements IteratorDelegate {
  private position = 0;

  constructor(private length: number) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(position: number): unknown;

  memoFor(position: number): unknown {
    return position;
  }

  next() {
    let { length, position } = this;

    if (position >= length) {
      return null;
    }

    let value = this.valueFor(position);
    let memo = this.memoFor(position);

    this.position++;

    return { value, memo };
  }
}

export class ArrayIterator extends BoundedIterator {
  static from(iterable: unknown[]) {
    return iterable.length > 0 ? new this(iterable) : null;
  }

  static fromForEachable(object: ForEachable) {
    let array: unknown[] = [];
    object.forEach((item) => array.push(item));
    return this.from(array);
  }

  constructor(private array: unknown[]) {
    super(array.length);
  }

  valueFor(position: number): unknown {
    return this.array[position];
  }
}

class EmberArrayIterator extends BoundedIterator {
  static from(iterable: EmberArray<unknown> | NativeArray<unknown>) {
    return iterable.length > 0 ? new this(iterable) : null;
  }

  constructor(private array: EmberArray<unknown> | NativeArray<unknown>) {
    super(array.length);
  }

  valueFor(position: number): unknown {
    return hooks.objectAt(this.array, position);
  }
}

interface NativeIteratorConstructor<T = unknown> {
  new (iterable: Iterator<T>, result: IteratorResult<T>): NativeIterator<T>;
}

export abstract class NativeIterator<T = unknown> implements IteratorDelegate {
  static from<T>(this: NativeIteratorConstructor<T>, iterable: Iterable<T>) {
    let iterator = iterable[Symbol.iterator]();
    let result = iterator.next();
    let { done } = result;

    if (done) {
      return null;
    } else {
      return new this(iterator, result);
    }
  }

  private position = 0;

  constructor(
    private iterable: Iterator<T>,
    private result: IteratorResult<T>
  ) {}

  isEmpty(): false {
    return false;
  }

  abstract valueFor(result: IteratorResult<T>, position: number): unknown;
  abstract memoFor(result: IteratorResult<T>, position: number): unknown;

  next() {
    let { iterable, result, position } = this;

    if (result.done) {
      return null;
    }

    let value = this.valueFor(result, position);
    let memo = this.memoFor(result, position);

    this.position++;
    this.result = iterable.next();

    return { value, memo };
  }
}

class ArrayLikeNativeIterator extends NativeIterator {
  valueFor(result: IteratorResult<unknown>): unknown {
    return result.value;
  }

  memoFor(_result: IteratorResult<unknown>, position: number): unknown {
    return position;
  }
}

export interface ForEachable {
  forEach(callback: (item: unknown, key: unknown) => void): void;
}

export function hasForEach(value: unknown): value is ForEachable {
  return value != null && typeof (value as ForEachable)['forEach'] === 'function';
}

export function isNativeIterable(value: unknown): value is Iterable<unknown> {
  return value != null && typeof (value as Iterable<unknown>)[Symbol.iterator] === 'function';
}
