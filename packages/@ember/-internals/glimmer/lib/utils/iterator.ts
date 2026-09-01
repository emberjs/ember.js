import { isObject } from '@ember/-internals/utils/lib/spec';
import type { Nullable } from '@ember/-internals/utility-types';
import type { IteratorDelegate } from '@glimmer/reference/lib/iterable';
import { hooks } from '../hooks';

/**
 * A value can bring its own iteration by implementing this method, the
 * way the `-each-in` wrapper does. That keeps the value's iterator out of
 * every bundle that never renders such a value.
 */
export const CUSTOM_ITERATE: unique symbol = Symbol('ember custom iterate');

export interface CustomIterable {
  [CUSTOM_ITERATE](): Nullable<IteratorDelegate>;
}

export default function toIterator(iterable: unknown): Nullable<IteratorDelegate> {
  if (isObject(iterable) && CUSTOM_ITERATE in (iterable as object)) {
    return (iterable as CustomIterable)[CUSTOM_ITERATE]();
  }

  let extended = hooks.toIteratorExtension(iterable);

  if (extended !== undefined) {
    return extended;
  }

  return toEachIterator(iterable);
}

function toEachIterator(iterable: unknown) {
  if (!isObject(iterable)) {
    return null;
  }

  if (Array.isArray(iterable)) {
    return ArrayIterator.from(iterable);
  } else if (isNativeIterable(iterable)) {
    return ArrayLikeNativeIterator.from(iterable);
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
