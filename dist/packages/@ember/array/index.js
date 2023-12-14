/**
@module @ember/array
*/
import { DEBUG } from '@glimmer/env';
import { PROXY_CONTENT } from '@ember/-internals/metal';
import { objectAt, replaceInNativeArray, replace, computed, beginPropertyChanges, endPropertyChanges } from '@ember/-internals/metal';
import { get, set } from '@ember/object';
import Mixin from '@ember/object/mixin';
import { assert } from '@ember/debug';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import { compare, typeOf } from '@ember/utils';
import { ENV } from '@ember/-internals/environment';
import Observable from '@ember/object/observable';
import { isEmberArray, setEmberArray } from '@ember/array/-internals';
export { default as makeArray } from './lib/make-array';
const EMPTY_ARRAY = Object.freeze([]);
const identityFunction = item => item;
export function uniqBy(array, keyOrFunc = identityFunction) {
  assert(`first argument passed to \`uniqBy\` should be array`, isArray(array));
  let ret = A();
  let seen = new Set();
  let getter = typeof keyOrFunc === 'function' ? keyOrFunc : item => get(item, keyOrFunc);
  array.forEach(item => {
    let val = getter(item);
    if (!seen.has(val)) {
      seen.add(val);
      ret.push(item);
    }
  });
  return ret;
}
function iter(...args) {
  let valueProvided = args.length === 2;
  let [key, value] = args;
  return valueProvided ? item => value === get(item, key) : item => Boolean(get(item, key));
}
function findIndex(array, predicate, startAt) {
  let len = array.length;
  for (let index = startAt; index < len; index++) {
    // SAFETY: Because we're checking the index this value should always be set.
    let item = objectAt(array, index);
    if (predicate(item, index, array)) {
      return index;
    }
  }
  return -1;
}
function find(array, callback, target = null) {
  let predicate = callback.bind(target);
  let index = findIndex(array, predicate, 0);
  return index === -1 ? undefined : objectAt(array, index);
}
function any(array, callback, target = null) {
  let predicate = callback.bind(target);
  return findIndex(array, predicate, 0) !== -1;
}
function every(array, callback, target = null) {
  let cb = callback.bind(target);
  let predicate = (item, index, array) => !cb(item, index, array);
  return findIndex(array, predicate, 0) === -1;
}
function indexOf(array, val, startAt = 0, withNaNCheck) {
  let len = array.length;
  if (startAt < 0) {
    startAt += len;
  }
  // SameValueZero comparison (NaN !== NaN)
  let predicate = withNaNCheck && val !== val ? item => item !== item : item => item === val;
  return findIndex(array, predicate, startAt);
}
export function removeAt(array, index, len) {
  assert(`\`removeAt\` index provided is out of range`, index > -1 && index < array.length);
  replace(array, index, len ?? 1, EMPTY_ARRAY);
  return array;
}
function insertAt(array, index, item) {
  assert(`\`insertAt\` index provided is out of range`, index > -1 && index <= array.length);
  replace(array, index, 0, [item]);
  return item;
}
/**
  Returns true if the passed object is an array or Array-like.

  Objects are considered Array-like if any of the following are true:

    - the object is a native Array
    - the object has an objectAt property
    - the object is an Object, and has a length property

  Unlike `typeOf` this method returns true even if the passed object is
  not formally an array but appears to be array-like (i.e. implements `Array`)

  ```javascript
  import { isArray } from '@ember/array';
  import ArrayProxy from '@ember/array/proxy';

  isArray();                                      // false
  isArray([]);                                    // true
  isArray(ArrayProxy.create({ content: [] }));    // true
  ```

  @method isArray
  @static
  @for @ember/array
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
  @public
*/
export function isArray(obj) {
  if (DEBUG && typeof obj === 'object' && obj !== null) {
    // SAFETY: Property read checks are safe if it's an object
    let possibleProxyContent = obj[PROXY_CONTENT];
    if (possibleProxyContent !== undefined) {
      obj = possibleProxyContent;
    }
  }
  // SAFETY: Property read checks are safe if it's an object
  if (!obj || obj.setInterval) {
    return false;
  }
  if (Array.isArray(obj) || EmberArray.detect(obj)) {
    return true;
  }
  let type = typeOf(obj);
  if ('array' === type) {
    return true;
  }
  // SAFETY: Property read checks are safe if it's an object
  let length = obj.length;
  if (typeof length === 'number' && length === length && 'object' === type) {
    return true;
  }
  return false;
}
/*
  This allows us to define computed properties that are not enumerable.
  The primary reason this is important is that when `NativeArray` is
  applied to `Array.prototype` we need to ensure that we do not add _any_
  new enumerable properties.
*/
function nonEnumerableComputed(callback) {
  let property = computed(callback);
  property.enumerable = false;
  return property;
}
function mapBy(key) {
  return this.map(next => get(next, key));
}
const EmberArray = Mixin.create(Enumerable, {
  init() {
    this._super(...arguments);
    setEmberArray(this);
  },
  objectsAt(indexes) {
    return indexes.map(idx => objectAt(this, idx));
  },
  '[]': nonEnumerableComputed({
    get() {
      return this;
    },
    set(_key, value) {
      this.replace(0, this.length, value);
      return this;
    }
  }),
  firstObject: nonEnumerableComputed(function () {
    return objectAt(this, 0);
  }).readOnly(),
  lastObject: nonEnumerableComputed(function () {
    return objectAt(this, this.length - 1);
  }).readOnly(),
  // Add any extra methods to EmberArray that are native to the built-in Array.
  slice(beginIndex = 0, endIndex) {
    let ret = A();
    let length = this.length;
    if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }
    let validatedEndIndex;
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
  indexOf(object, startAt) {
    return indexOf(this, object, startAt, false);
  },
  lastIndexOf(object, startAt) {
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
  forEach(callback, target = null) {
    assert('`forEach` expects a function as first argument.', typeof callback === 'function');
    let length = this.length;
    for (let index = 0; index < length; index++) {
      let item = this.objectAt(index);
      callback.call(target, item, index, this);
    }
    return this;
  },
  getEach: mapBy,
  setEach(key, value) {
    return this.forEach(item => set(item, key, value));
  },
  map(callback, target = null) {
    assert('`map` expects a function as first argument.', typeof callback === 'function');
    let ret = A();
    this.forEach((x, idx, i) => ret[idx] = callback.call(target, x, idx, i));
    return ret;
  },
  mapBy,
  filter(callback, target = null) {
    assert('`filter` expects a function as first argument.', typeof callback === 'function');
    let ret = A();
    this.forEach((x, idx, i) => {
      if (callback.call(target, x, idx, i)) {
        ret.push(x);
      }
    });
    return ret;
  },
  reject(callback, target = null) {
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
  find(callback, target = null) {
    assert('`find` expects a function as first argument.', typeof callback === 'function');
    return find(this, callback, target);
  },
  findBy() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    let callback = iter(...arguments);
    return find(this, callback);
  },
  every(callback, target = null) {
    assert('`every` expects a function as first argument.', typeof callback === 'function');
    return every(this, callback, target);
  },
  isEvery() {
    // @ts-expect-error TS doesn't like the ...arguments spread here.
    let callback = iter(...arguments);
    return every(this, callback);
  },
  any(callback, target = null) {
    assert('`any` expects a function as first argument.', typeof callback === 'function');
    return any(this, callback, target);
  },
  isAny() {
    // @ts-expect-error TS doesn't like us using arguments like this
    let callback = iter(...arguments);
    return any(this, callback);
  },
  // FIXME: When called without initialValue, behavior does not match native behavior
  reduce(callback, initialValue) {
    assert('`reduce` expects a function as first argument.', typeof callback === 'function');
    let ret = initialValue;
    this.forEach(function (item, i) {
      ret = callback(ret, item, i, this);
    }, this);
    return ret;
  },
  invoke(methodName, ...args) {
    let ret = A();
    // SAFETY: This is not entirely safe and the code will not work with Ember proxies
    this.forEach(item => ret.push(item[methodName]?.(...args)));
    return ret;
  },
  toArray() {
    return this.map(item => item);
  },
  compact() {
    return this.filter(value => value != null);
  },
  includes(object, startAt) {
    return indexOf(this, object, startAt, true) !== -1;
  },
  sortBy() {
    let sortKeys = arguments;
    return this.toArray().sort((a, b) => {
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
  uniqBy(key) {
    return uniqBy(this, key);
  },
  without(value) {
    if (!this.includes(value)) {
      return this; // nothing to do
    }
    // SameValueZero comparison (NaN !== NaN)
    let predicate = value === value ? item => item !== value : item => item === item;
    return this.filter(predicate);
  }
});
const MutableArray = Mixin.create(EmberArray, MutableEnumerable, {
  clear() {
    let len = this.length;
    if (len === 0) {
      return this;
    }
    this.replace(0, len, EMPTY_ARRAY);
    return this;
  },
  insertAt(idx, object) {
    insertAt(this, idx, object);
    return this;
  },
  removeAt(start, len) {
    return removeAt(this, start, len);
  },
  pushObject(obj) {
    return insertAt(this, this.length, obj);
  },
  pushObjects(objects) {
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
  unshiftObject(obj) {
    return insertAt(this, 0, obj);
  },
  unshiftObjects(objects) {
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
  setObjects(objects) {
    if (objects.length === 0) {
      return this.clear();
    }
    let len = this.length;
    this.replace(0, len, objects);
    return this;
  },
  removeObject(obj) {
    let loc = this.length || 0;
    while (--loc >= 0) {
      let curObject = objectAt(this, loc);
      if (curObject === obj) {
        this.removeAt(loc);
      }
    }
    return this;
  },
  removeObjects(objects) {
    beginPropertyChanges();
    for (let i = objects.length - 1; i >= 0; i--) {
      // SAFETY: Due to the loop structure we know this will always exist.
      this.removeObject(objects[i]);
    }
    endPropertyChanges();
    return this;
  },
  addObject(obj) {
    let included = this.includes(obj);
    if (!included) {
      this.pushObject(obj);
    }
    return this;
  },
  addObjects(objects) {
    beginPropertyChanges();
    objects.forEach(obj => this.addObject(obj));
    endPropertyChanges();
    return this;
  }
});
let NativeArray = Mixin.create(MutableArray, Observable, {
  objectAt(idx) {
    return this[idx];
  },
  // primitive for array support.
  replace(start, deleteCount, items = EMPTY_ARRAY) {
    assert('The third argument to replace needs to be an array.', Array.isArray(items));
    replaceInNativeArray(this, start, deleteCount, items);
    return this;
  }
});
// Remove any methods implemented natively so we don't override them
const ignore = ['length'];
NativeArray.keys().forEach(methodName => {
  // SAFETY: It's safe to read unknown properties from an object
  if (Array.prototype[methodName]) {
    ignore.push(methodName);
  }
});
NativeArray = NativeArray.without(...ignore);
let A;
if (ENV.EXTEND_PROTOTYPES.Array) {
  NativeArray.apply(Array.prototype, true);
  A = function (arr) {
    assert('You cannot create an Ember Array with `new A()`, please update to calling A as a function: `A()`', !(this instanceof A));
    // SAFTEY: Since we are extending prototypes all true native arrays are Ember NativeArrays
    return arr || [];
  };
} else {
  A = function (arr) {
    assert('You cannot create an Ember Array with `new A()`, please update to calling A as a function: `A()`', !(this instanceof A));
    if (isEmberArray(arr)) {
      // SAFETY: If it's a true native array and it is also an EmberArray then it should be an Ember NativeArray
      return arr;
    } else {
      // SAFETY: This will return an NativeArray but TS can't infer that.
      return NativeArray.apply(arr ?? []);
    }
  };
}
export { A, NativeArray, MutableArray };
export default EmberArray;