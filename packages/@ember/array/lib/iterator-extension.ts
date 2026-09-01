import type EmberArray from '@ember/array';
import type { NativeArray } from '@ember/array';
import { objectAt } from '@ember/-internals/metal/lib/object-at';
import { registerEnvironmentHooks } from '@ember/-internals/glimmer/lib/hooks';
import {
  ArrayIterator,
  BoundedIterator,
  hasForEach,
  isNativeIterable,
} from '@ember/-internals/glimmer/lib/utils/iterator';
import { isEmberArray } from '../-internals';

class EmberArrayIterator extends BoundedIterator {
  static from(iterable: EmberArray<unknown> | NativeArray<unknown>) {
    return iterable.length > 0 ? new this(iterable) : null;
  }

  constructor(private array: EmberArray<unknown> | NativeArray<unknown>) {
    super(array.length);
  }

  valueFor(position: number): unknown {
    return objectAt(this.array, position);
  }
}

// Ember arrays and `forEach`-able objects iterate only once `@ember/array`
// is loaded. Native arrays and iterables stay with the default iterator.
registerEnvironmentHooks({
  toIteratorExtension: (value) => {
    if (Array.isArray(value) || isNativeIterable(value)) {
      return undefined;
    }

    if (isEmberArray(value)) {
      return EmberArrayIterator.from(value);
    }

    if (hasForEach(value)) {
      return ArrayIterator.fromForEachable(value);
    }

    return undefined;
  },
});
