import { objectAt, tagForProperty } from '@ember/-internals/metal';
import { _contentFor } from '@ember/-internals/runtime';
import { EmberArray, HAS_NATIVE_SYMBOL, isEmberArray, isObject } from '@ember/-internals/utils';
import { Option } from '@glimmer/interfaces';
import { IteratorDelegate } from '@glimmer/reference';
import { consume, isTracking } from '@glimmer/validator';
import { EachInWrapper } from '../helpers/each-in';

export default function toIterator(iterable: unknown): Option<IteratorDelegate> {
  if (iterable instanceof EachInWrapper) {
    return toEachInIterator(iterable.inner);
  } else {
    return toEachIterator(iterable);
  }
}

function toEachInIterator(iterable: unknown) {
  if (!isIndexable(iterable)) {
    return null;
  }

  if (Array.isArray(iterable) || isEmberArray(iterable)) {
    return ObjectIterator.fromIndexable(iterable);
  } else if (HAS_NATIVE_SYMBOL && isNativeIterable<[unknown, unknown]>(iterable)) {
    return MapLikeNativeIterator.from(iterable);
  } else if (hasForEach(iterable)) {
    return ObjectIterator.fromForEachable(iterable);
  } else {
    return ObjectIterator.fromIndexable(iterable);
  }
}

function toEachIterator(iterable: unknown) {
  if (!isObject(iterable)) {
    return null;
  }

  if (Array.isArray(iterable)) {
    return ArrayIterator.from(iterable);
  } else if (isEmberArray(iterable)) {
    return EmberArrayIterator.from(iterable);
  } else if (HAS_NATIVE_SYMBOL && isNativeIterable(iterable)) {
    return ArrayLikeNativeIterator.from(iterable);
  } else if (hasForEach(iterable)) {
    return ArrayIterator.fromForEachable(iterable);
  } else {
    return null;
  }
}

abstract class BoundedIterator implements IteratorDelegate {
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

class ArrayIterator extends BoundedIterator {
  static from(iterable: unknown[]) {
    return iterable.length > 0 ? new this(iterable) : null;
  }

  static fromForEachable(object: ForEachable) {
    let array: unknown[] = [];
    object.forEach(item => array.push(item));
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
  static from(iterable: EmberArray<unknown>) {
    return iterable.length > 0 ? new this(iterable) : null;
  }

  constructor(private array: EmberArray<unknown>) {
    super(array.length);
  }

  valueFor(position: number): unknown {
    return objectAt(this.array as any, position);
  }
}

class ObjectIterator extends BoundedIterator {
  static fromIndexable(obj: Indexable) {
    let keys = Object.keys(obj);
    let { length } = keys;

    if (length === 0) {
      return null;
    } else {
      let values: unknown[] = [];
      for (let i = 0; i < length; i++) {
        let value: any;
        let key = keys[i];

        value = obj[key];

        // Add the tag of the returned value if it is an array, since arrays
        // should always cause updates if they are consumed and then changed
        if (isTracking()) {
          consume(tagForProperty(obj, key));

          if (Array.isArray(value) || isEmberArray(value)) {
            consume(tagForProperty(value, '[]'));
          }
        }

        values.push(value);
      }
      return new this(keys, values);
    }
  }

  static fromForEachable(obj: ForEachable) {
    let keys: unknown[] = [];
    let values: unknown[] = [];
    let length = 0;
    let isMapLike = false;

    obj.forEach((value: unknown, key: unknown) => {
      isMapLike = isMapLike || arguments.length >= 2;

      if (isMapLike) {
        keys.push(key);
      }
      values.push(value);

      length++;
    });

    if (length === 0) {
      return null;
    } else if (isMapLike) {
      return new this(keys, values);
    } else {
      return new ArrayIterator(values);
    }
  }

  constructor(private keys: unknown[], private values: unknown[]) {
    super(values.length);
  }

  valueFor(position: number): unknown {
    return this.values[position];
  }

  memoFor(position: number): unknown {
    return this.keys[position];
  }
}

interface NativeIteratorConstructor<T = unknown> {
  new (iterable: Iterator<T>, result: IteratorResult<T>): NativeIterator<T>;
}

abstract class NativeIterator<T = unknown> implements IteratorDelegate {
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

  constructor(private iterable: Iterator<T>, private result: IteratorResult<T>) {}

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

class MapLikeNativeIterator extends NativeIterator<[unknown, unknown]> {
  valueFor(result: IteratorResult<[unknown, unknown]>): unknown {
    return result.value[1];
  }

  memoFor(result: IteratorResult<[unknown, unknown]>): unknown {
    return result.value[0];
  }
}

interface ForEachable {
  forEach(callback: (item: unknown, key: unknown) => void): void;
}

function hasForEach(value: object): value is ForEachable {
  return typeof value['forEach'] === 'function';
}

function isNativeIterable<T = unknown>(value: object): value is Iterable<T> {
  return typeof value[Symbol.iterator] === 'function';
}

interface Indexable {
  readonly [key: string]: unknown;
}

function isIndexable(value: unknown): value is Indexable {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}
