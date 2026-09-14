/**
@module @ember/array
*/
import { objectAt } from '@ember/-internals/metal/lib/object-at';
import { replaceInNativeArray, replace } from '@ember/-internals/metal/lib/array';
import computed from '@ember/-internals/metal/lib/computed';
import {
  beginPropertyChanges,
  endPropertyChanges,
} from '@ember/-internals/metal/lib/property_events';
import { get } from '@ember/-internals/metal/lib/property_get';
import { set } from '@ember/-internals/metal/lib/property_set';
import { InternalMixin } from '@ember/object/mixin-internal';
import { assert } from '@ember/debug';
import InternalEnumerable from '@ember/enumerable/-internal';
import InternalMutableEnumerable from '@ember/enumerable/mutable-internal';
import compare from '@ember/utils/lib/compare';
import InternalObservable from '@ember/object/observable-internal';
import type { ComputedPropertyCallback } from '@ember/-internals/metal/lib/computed';
import { isEmberArray, setEmberArray } from '@ember/array/-internals';
import isArray from './lib/is-array';
import type EmberArray from '@ember/array';
import type { MutableArray, NativeArray } from '@ember/array';

const EMPTY_ARRAY = Object.freeze([] as const);

const identityFunction = <T>(item: T) => item;

export function uniqBy<T>(
  array: T[] | EmberArray<T>,
  keyOrFunc: string | ((item: T) => unknown) = identityFunction
): T[] | EmberArray<T> {
  assert(`first argument passed to \`uniqBy\` should be array`, isArray(array));

  let ret = A<T>();
  let seen = new Set();
  let getter = typeof keyOrFunc === 'function' ? keyOrFunc : (item: T) => get(item, keyOrFunc);

  array.forEach((item) => {
    let val = getter(item);
    if (!seen.has(val)) {
      seen.add(val);
      ret.push(item);
    }
  });

  return ret;
}

function iter<T>(key: string): (item: T) => boolean;
function iter<T>(key: string, value: unknown): (item: T) => boolean;
function iter<T>(...args: [key: string] | [key: string, value: unknown]) {
  let valueProvided = args.length === 2;
  let [key, value] = args;

  return valueProvided
    ? (item: T) => value === get(item, key)
    : (item: T) => Boolean(get(item, key));
}

function findIndex<T>(
  array: EmberArray<T>,
  predicate: (item: T, index: number, arr: EmberArray<T>) => unknown,
  startAt: number
): number {
  let len = array.length;
  for (let index = startAt; index < len; index++) {
    // SAFETY: Because we're checking the index this value should always be set.
    let item = objectAt(array, index)!;
    if (predicate(item, index, array)) {
      return index;
    }
  }
  return -1;
}

function find<T, Target>(
  array: EmberArray<T>,
  callback: (this: Target | null, item: T, index: number, arr: EmberArray<T>) => unknown,
  target: Target | null = null
) {
  let predicate = callback.bind(target);
  let index = findIndex(array, predicate, 0);
  return index === -1 ? undefined : objectAt(array, index);
}

function any<T, Target>(
  array: EmberArray<T>,
  callback: (this: Target | null, item: T, index: number, arr: EmberArray<T>) => unknown,
  target: Target | null = null
) {
  let predicate = callback.bind(target);
  return findIndex(array, predicate, 0) !== -1;
}

function every<T, Target>(
  array: EmberArray<T>,
  callback: (this: Target | null | void, item: T, index: number, arr: EmberArray<T>) => unknown,
  target: Target | null = null
) {
  let cb = callback.bind(target);
  let predicate = (item: T, index: number, array: EmberArray<T>) => !cb(item, index, array);
  return findIndex(array, predicate, 0) === -1;
}

function indexOf<T>(array: EmberArray<T>, val: T, startAt = 0, withNaNCheck: boolean) {
  let len = array.length;

  if (startAt < 0) {
    startAt += len;
  }

  // SameValueZero comparison (NaN !== NaN)
  let predicate =
    withNaNCheck && val !== val ? (item: T) => item !== item : (item: T) => item === val;
  return findIndex(array, predicate, startAt);
}

export function removeAt<T, A extends T[] | MutableArray<T>>(
  array: A,
  index: number,
  len?: number
): A {
  assert(`\`removeAt\` index provided is out of range`, index > -1 && index < array.length);
  replace(array, index, len ?? 1, EMPTY_ARRAY);
  return array;
}

function insertAt<T>(array: MutableArray<T>, index: number, item: T) {
  assert(`\`insertAt\` index provided is out of range`, index > -1 && index <= array.length);
  replace(array, index, 0, [item]);
  return item;
}

export { isArray };

/*
  This allows us to define computed properties that are not enumerable.
*/
function nonEnumerableComputed(callback: ComputedPropertyCallback) {
  let property = computed(callback);
  property.enumerable = false;
  return property;
}

function mapBy<T>(this: EmberArray<T>, key: string) {
  return this.map((next) => get(next, key));
}

// ..........................................................
// ARRAY
//

/**
  The internal counterparts to the public `EmberArray`, `MutableArray` and
  `NativeArray` mixins. Ember's own internals apply these so that they do not
  trigger the deprecations the public mixins emit. The public API
  documentation lives on the public copies in `@ember/array`.

  @internal
*/
const InternalEmberArray = InternalMixin.create(InternalEnumerable, {
  init() {
    this._super(...arguments);
    setEmberArray(this);
  },

  objectsAt(indexes: number[]) {
    return indexes.map((idx) => objectAt(this, idx));
  },

  '[]': nonEnumerableComputed({
    get() {
      return this;
    },
    set(_key, value) {
      this.replace(0, this.length, value);
      return this;
    },
  }),

  firstObject: nonEnumerableComputed(function () {
    return objectAt(this, 0);
  }).readOnly(),

  lastObject: nonEnumerableComputed(function () {
    return objectAt(this, this.length - 1);
  }).readOnly(),

  // Add any extra methods to EmberArray that are native to the built-in Array.
  slice(beginIndex = 0, endIndex?: number) {
    let ret = A();
    let length = this.length;

    if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }

    let validatedEndIndex: number;
    if (endIndex === undefined || endIndex > length) {
      validatedEndIndex = length;
    } else if (endIndex < 0) {
      validatedEndIndex = length + endIndex;
    } else {
      validatedEndIndex = endIndex;
    }

    while (beginIndex < validatedEndIndex) {
      ret[ret.length] = objectAt(this, beginIndex++);
    }

    return ret;
  },

  indexOf<T>(object: T, startAt?: number) {
    return indexOf(this, object, startAt, false);
  },

  lastIndexOf<T>(object: T, startAt?: number) {
    let len = this.length;

    if (startAt === undefined || startAt >= len) {
      startAt = len - 1;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx >= 0; idx--) {
      if (objectAt(this, idx) === object) {
        return idx;
      }
    }

    return -1;
  },

  forEach(callback: <T>(item: T, index: number, arr: EmberArray<T>) => void, target = null) {
    assert('`forEach` expects a function as first argument.', typeof callback === 'function');

    let length = this.length;

    for (let index = 0; index < length; index++) {
      let item = this.objectAt(index);
      callback.call(target, item, index, this);
    }

    return this;
  },

  getEach: mapBy,

  setEach(key: string, value: unknown) {
    return this.forEach((item: object) => set(item, key, value));
  },

  map<T>(
    this: EmberArray<T>,
    callback: (item: T, index: number, arr: EmberArray<T>) => unknown,
    target = null
  ) {
    assert('`map` expects a function as first argument.', typeof callback === 'function');

    let ret = A();

    this.forEach((x, idx, i) => (ret[idx] = callback.call(target, x, idx, i)));

    return ret;
  },

  mapBy,

  filter<T>(
    this: EmberArray<T>,
    callback: (item: T, index: number, arr: EmberArray<T>) => unknown,
    target = null
  ) {
    assert('`filter` expects a function as first argument.', typeof callback === 'function');

    let ret = A();

    this.forEach((x, idx, i) => {
      if (callback.call(target, x, idx, i)) {
        ret.push(x);
      }
    });

    return ret;
  },

  reject<T>(
    this: EmberArray<T>,
    callback: (item: T, index: number, arr: EmberArray<T>) => unknown,
    target = null
  ) {
    assert('`reject` expects a function as first argument.', typeof callback === 'function');
    return this.filter(function () {
      // @ts-expect-error TS doesn't like us using arguments like this
      return !callback.apply(target, arguments);
    });
  },

  filterBy() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    return this.filter(iter(...arguments));
  },

  rejectBy() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    return this.reject(iter(...arguments));
  },

  find(callback: <T>(item: T, index: number, arr: EmberArray<T>) => unknown, target = null) {
    assert('`find` expects a function as first argument.', typeof callback === 'function');
    return find(this, callback, target);
  },

  findBy() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    let callback = iter(...arguments);
    return find(this, callback);
  },

  every(callback: <T>(item: T, index: number, arr: EmberArray<T>) => unknown, target = null) {
    assert('`every` expects a function as first argument.', typeof callback === 'function');
    return every(this, callback, target);
  },

  isEvery() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    let callback = iter(...arguments);
    return every(this, callback);
  },

  any(callback: <T>(item: T, index: number, arr: EmberArray<T>) => unknown, target = null) {
    assert('`any` expects a function as first argument.', typeof callback === 'function');
    return any(this, callback, target);
  },

  isAny() {
    // @ts-expect-error TS doesn't like us using arguments like this
    let callback = iter(...arguments);
    return any(this, callback);
  },

  // FIXME: When called without initialValue, behavior does not match native behavior
  reduce<T, V>(
    this: EmberArray<T>,
    callback: (summation: V, current: T, index: number, arr: EmberArray<T>) => V,
    initialValue?: V
  ) {
    assert('`reduce` expects a function as first argument.', typeof callback === 'function');

    let hasInitialValue = arguments.length > 1;
    let ret: any = initialValue;
    let startIndex = 0;

    if (!hasInitialValue) {
      if (this.length === 0) {
        throw new TypeError('Reduce of empty array with no initial value');
      }
      ret = this.objectAt(0);
      startIndex = 1;
    }

    for (let i = startIndex; i < this.length; i++) {
      let item = this.objectAt(i) as T;
      ret = callback(ret, item, i, this);
    }

    return ret;
  },

  invoke<T>(this: EmberArray<T>, methodName: string, ...args: unknown[]) {
    let ret = A();

    // SAFETY: This is not entirely safe and the code will not work with Ember proxies
    this.forEach((item: T) => ret.push((item as any)[methodName]?.(...args)));

    return ret;
  },

  toArray<T>(this: EmberArray<T>) {
    return this.map((item: T) => item);
  },

  compact<T>(this: EmberArray<T>) {
    return this.filter((value: T) => value != null);
  },

  includes<T>(this: EmberArray<T>, object: T, startAt?: number) {
    return indexOf(this, object, startAt, true) !== -1;
  },

  sortBy<T>(this: EmberArray<T>) {
    let sortKeys = arguments;

    return this.toArray().sort((a: T, b: T) => {
      for (let i = 0; i < sortKeys.length; i++) {
        let key = sortKeys[i];
        let propA = get(a, key);
        let propB = get(b, key);
        // return 1 or -1 else continue to the next sortKey
        let compareValue = compare(propA, propB);

        if (compareValue) {
          return compareValue;
        }
      }
      return 0;
    });
  },

  uniq() {
    return uniqBy(this);
  },

  uniqBy(key: string) {
    return uniqBy(this, key);
  },

  without<T>(this: EmberArray<T>, value: T) {
    if (!this.includes(value)) {
      return this; // nothing to do
    }

    // SameValueZero comparison (NaN !== NaN)
    let predicate = value === value ? (item: T) => item !== value : (item: T) => item === item;
    return this.filter(predicate);
  },
});

const InternalMutableArray = InternalMixin.create(InternalEmberArray, InternalMutableEnumerable, {
  clear() {
    let len = this.length;
    if (len === 0) {
      return this;
    }

    this.replace(0, len, EMPTY_ARRAY);
    return this;
  },

  insertAt(idx: number, object: unknown) {
    insertAt(this, idx, object);
    return this;
  },

  removeAt(start: number, len?: number) {
    return removeAt(this, start, len);
  },

  pushObject<T>(this: MutableArray<T>, obj: T) {
    return insertAt(this, this.length, obj);
  },

  pushObjects<T>(this: MutableArray<T>, objects: T[]) {
    this.replace(this.length, 0, objects);
    return this;
  },

  popObject() {
    let len = this.length;
    if (len === 0) {
      return null;
    }

    let ret = objectAt(this, len - 1);
    this.removeAt(len - 1, 1);
    return ret;
  },

  shiftObject() {
    if (this.length === 0) {
      return null;
    }

    let ret = objectAt(this, 0);
    this.removeAt(0);
    return ret;
  },

  unshiftObject<T>(this: MutableArray<T>, obj: T) {
    return insertAt(this, 0, obj);
  },

  unshiftObjects<T>(this: MutableArray<T>, objects: T[]) {
    this.replace(0, 0, objects);
    return this;
  },

  reverseObjects() {
    let len = this.length;
    if (len === 0) {
      return this;
    }

    let objects = this.toArray().reverse();
    this.replace(0, len, objects);
    return this;
  },

  setObjects<T>(this: MutableArray<T>, objects: T[]) {
    if (objects.length === 0) {
      return this.clear();
    }

    let len = this.length;
    this.replace(0, len, objects);
    return this;
  },

  removeObject<T>(this: MutableArray<T>, obj: T) {
    let loc = this.length || 0;
    while (--loc >= 0) {
      let curObject = objectAt(this, loc);

      if (curObject === obj) {
        this.removeAt(loc);
      }
    }
    return this;
  },

  removeObjects<T>(this: MutableArray<T>, objects: T[]) {
    beginPropertyChanges();
    for (let i = objects.length - 1; i >= 0; i--) {
      // SAFETY: Due to the loop structure we know this will always exist.
      this.removeObject(objects[i]!);
    }
    endPropertyChanges();
    return this;
  },

  addObject<T>(this: MutableArray<T>, obj: T) {
    let included = this.includes(obj);

    if (!included) {
      this.pushObject(obj);
    }

    return this;
  },

  addObjects<T>(this: MutableArray<T>, objects: T[]) {
    beginPropertyChanges();
    objects.forEach((obj) => this.addObject(obj));
    endPropertyChanges();
    return this;
  },
});

/**
  Creates an `NativeArray` from an Array-like object.
  Does not modify the original object's contents.
    
  This exists primarily for historic reasons and should not be used
  in new code. Prefer native [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
  or [trackedArray](/ember/release/functions/@ember%2Freactive%2Fcollections/trackedArray).

  Example

  ```app/components/my-component.js
  import Component from '@ember/component';
  import { A } from '@ember/array';

  export default Component.extend({
    tagName: 'ul',
    classNames: ['pagination'],

    init() {
      this._super(...arguments);

      if (!this.get('content')) {
        this.set('content', A());
        this.set('otherContent', A([1,2,3]));
      }
    }
  });
  ```

  @method A
  @static
  @for @ember/array
  @return {Ember.NativeArray}
  @public
*/

// Add Ember.Array to Array.prototype. Remove methods with native
// implementations and supply some more optimized versions of generic methods
// because they are so common.
/**
@module ember
*/

let InternalNativeArray = InternalMixin.create(InternalMutableArray, InternalObservable, {
  objectAt(idx: number) {
    return this[idx];
  },

  // primitive for array support.
  replace(start: number, deleteCount: number, items = EMPTY_ARRAY) {
    assert('The third argument to replace needs to be an array.', Array.isArray(items));

    replaceInNativeArray(this, start, deleteCount, items);

    return this;
  },
});

// Remove any methods implemented natively so we don't override them
const ignore = ['length'];
InternalNativeArray.keys().forEach((methodName) => {
  // SAFETY: It's safe to read unknown properties from an object
  if ((Array.prototype as any)[methodName]) {
    ignore.push(methodName);
  }
});

InternalNativeArray = InternalNativeArray.without(...ignore);

let A: <T>(arr?: Array<T>) => NativeArray<T>;

A = function <T>(this: unknown, arr?: Array<T>) {
  assert(
    'You cannot create an Ember Array with `new A()`, please update to calling A as a function: `A()`',
    !(this instanceof A)
  );

  if (isEmberArray(arr)) {
    // SAFETY: If it's a true native array and it is also an EmberArray then it should be an Ember NativeArray
    return arr as unknown as NativeArray<T>;
  } else {
    // SAFETY: This will return an NativeArray but TS can't infer that.
    return InternalNativeArray.apply(arr ?? []) as NativeArray<T>;
  }
};

export { A, InternalEmberArray, InternalMutableArray, InternalNativeArray };

export default InternalEmberArray;
