import type { Nullable } from '@ember/-internals/utility-types';
import type { IteratorDelegate } from '@glimmer/reference/lib/iterable';
import { consumeTag, isTracking } from '@glimmer/validator/lib/tracking';
import { tagFor } from '@glimmer/validator/lib/meta';
import { hooks } from '../hooks';
import {
  ArrayIterator,
  BoundedIterator,
  type ForEachable,
  hasForEach,
  isNativeIterable,
  NativeIterator,
} from './iterator';

/**
 * Iteration over keys and values, used by `{{#each-in}}`. The `-each-in`
 * helper registers this as an iterator extension when it loads, so a
 * template without `each-in` does not carry it.
 */
export function toEachInIterator(iterable: unknown): Nullable<IteratorDelegate> {
  if (!isIndexable(iterable)) {
    return null;
  }

  if (Array.isArray(iterable) || hooks.isEmberArray(iterable)) {
    return ObjectIterator.fromIndexable(iterable);
  } else if (isNativeIterable(iterable)) {
    return MapLikeNativeIterator.from(iterable as Iterable<[unknown, unknown]>);
  } else if (hasForEach(iterable)) {
    return ObjectIterator.fromForEachable(iterable);
  } else {
    return ObjectIterator.fromIndexable(iterable);
  }
}

class ObjectIterator extends BoundedIterator {
  static fromIndexable(obj: Indexable) {
    let keys = Object.keys(obj);

    if (keys.length === 0) {
      return null;
    } else {
      let values: unknown[] = [];
      for (let key of keys) {
        let value: any;

        value = obj[key];

        // Add the tag of the returned value if it is an array, since arrays
        // should always cause updates if they are consumed and then changed
        if (isTracking()) {
          consumeTag(tagFor(obj, key));

          if (Array.isArray(value)) {
            consumeTag(tagFor(value, '[]'));
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

    // Not using an arrow function here so we can get an accurate `arguments`
    obj.forEach(function (value: unknown, key: unknown) {
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

  constructor(
    private keys: unknown[],
    private values: unknown[]
  ) {
    super(values.length);
  }

  valueFor(position: number): unknown {
    return this.values[position];
  }

  memoFor(position: number): unknown {
    return this.keys[position];
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

interface Indexable {
  readonly [key: string]: unknown;
}

function isIndexable(value: unknown): value is Indexable {
  return value !== null && (typeof value === 'object' || typeof value === 'function');
}
