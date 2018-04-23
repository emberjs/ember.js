/**
@module @ember/array
*/

import { symbol, toString } from 'ember-utils';
import {
  get,
  set,
  objectAt,
  replaceInNativeArray,
  computed,
  aliasMethod,
  Mixin,
  hasListeners,
  eachProxyFor,
  beginPropertyChanges,
  endPropertyChanges,
  addArrayObserver,
  removeArrayObserver,
  arrayContentWillChange,
  arrayContentDidChange,
} from 'ember-metal';
import { assert, deprecate } from '@ember/debug';
import Enumerable from './enumerable';
import compare from '../compare';
import { ENV } from 'ember-environment';
import Observable from '../mixins/observable';
import Copyable from '../mixins/copyable';
import copy from '../copy';
import EmberError from '@ember/error';
import MutableEnumerable from './mutable_enumerable';
import { uniqBy } from '../utils';

const EMPTY_ARRAY = Object.freeze([]);
const EMBER_ARRAY = symbol('EMBER_ARRAY');

export function isEmberArray(obj) {
  return obj && obj[EMBER_ARRAY];
}

function iter(key, value) {
  let valueProvided = arguments.length === 2;
  return valueProvided ? item => value === get(item, key) : item => !!get(item, key);
}

function indexOf(array, val, startAt = 0, withNaNCheck) {
  let len = array.length;

  if (startAt < 0) {
    startAt += len;
  }

  // SameValueZero comparison (NaN !== NaN)
  let predicate = withNaNCheck && val !== val ? item => item !== item : item => item === val;

  for (let idx = startAt; idx < len; idx++) {
    let item = objectAt(array, idx);
    if (predicate(item)) {
      return idx;
    }
  }

  return -1;
}

// ..........................................................
// ARRAY
//
/**
  This mixin implements Observer-friendly Array-like behavior. It is not a
  concrete implementation, but it can be used up by other classes that want
  to appear like arrays.

  For example, ArrayProxy is a concrete classes that can
  be instantiated to implement array-like behavior. Both of these classes use
  the Array Mixin by way of the MutableArray mixin, which allows observable
  changes to be made to the underlying array.

  This mixin defines methods specifically for collections that provide
  index-ordered access to their contents. When you are designing code that
  needs to accept any kind of Array-like object, you should use these methods
  instead of Array primitives because these will properly notify observers of
  changes to the array.

  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as controllers and collections.

  You can use the methods defined in this module to access and modify array
  contents in a KVO-friendly way. You can also be notified whenever the
  membership of an array changes by using `.observes('myArray.[]')`.

  To support `EmberArray` in your own class, you must override two
  primitives to use it: `length()` and `objectAt()`.

  @class EmberArray
  @uses Enumerable
  @since Ember 0.9.0
  @public
*/
const ArrayMixin = Mixin.create(Enumerable, {
  [EMBER_ARRAY]: true,

  /**
    __Required.__ You must implement this method to apply this mixin.

    Your array must support the `length` property. Your replace methods should
    set this property whenever it changes.

    @property {Number} length
    @public
  */
  length: null,

  /**
    Returns the object at the given `index`. If the given `index` is negative
    or is greater or equal than the array length, returns `undefined`.

    This is one of the primitives you must implement to support `EmberArray`.
    If your object supports retrieving the value of an array item using `get()`
    (i.e. `myArray.get(0)`), then you do not need to implement this method
    yourself.

    ```javascript
    let arr = ['a', 'b', 'c', 'd'];

    arr.objectAt(0);   // 'a'
    arr.objectAt(3);   // 'd'
    arr.objectAt(-1);  // undefined
    arr.objectAt(4);   // undefined
    arr.objectAt(5);   // undefined
    ```

    @method objectAt
    @param {Number} idx The index of the item to return.
    @return {*} item at index or undefined
    @public
  */
  objectAt(idx) {
    if (idx < 0 || idx >= this.length) {
      return undefined;
    }

    return get(this, idx);
  },

  /**
    This returns the objects at the specified indexes, using `objectAt`.

    ```javascript
    let arr = ['a', 'b', 'c', 'd'];

    arr.objectsAt([0, 1, 2]);  // ['a', 'b', 'c']
    arr.objectsAt([2, 3, 4]);  // ['c', 'd', undefined]
    ```

    @method objectsAt
    @param {Array} indexes An array of indexes of items to return.
    @return {Array}
    @public
   */
  objectsAt(indexes) {
    return indexes.map(idx => objectAt(this, idx));
  },

  /**
    This is the handler for the special array content property. If you get
    this property, it will return this. If you set this property to a new
    array, it will replace the current content.

    @property []
    @return this
    @public
  */
  '[]': computed({
    get() {
      return this;
    },
    set(key, value) {
      this.replace(0, this.length, value);
      return this;
    },
  }),

  /**
    The first object in the array, or `undefined` if the array is empty.

    @property firstObject
    @return {Object | undefined} The first object in the array
    @public
  */
  firstObject: computed(function() {
    return objectAt(this, 0);
  }).readOnly(),

  /**
    The last object in the array, or `undefined` if the array is empty.

    @property lastObject
    @return {Object | undefined} The last object in the array
    @public
  */
  lastObject: computed(function() {
    return objectAt(this, this.length - 1);
  }).readOnly(),

  // Add any extra methods to EmberArray that are native to the built-in Array.
  /**
    Returns a new array that is a slice of the receiver. This implementation
    uses the observable array methods to retrieve the objects for the new
    slice.

    ```javascript
    let arr = ['red', 'green', 'blue'];

    arr.slice(0);       // ['red', 'green', 'blue']
    arr.slice(0, 2);    // ['red', 'green']
    arr.slice(1, 100);  // ['green', 'blue']
    ```

    @method slice
    @param {Number} beginIndex (Optional) index to begin slicing from.
    @param {Number} endIndex (Optional) index to end the slice at (but not included).
    @return {Array} New array with specified slice
    @public
  */
  slice(beginIndex = 0, endIndex) {
    let ret = A();
    let length = this.length;

    if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }

    if (endIndex === undefined || endIndex > length) {
      endIndex = length;
    } else if (endIndex < 0) {
      endIndex = length + endIndex;
    }

    while (beginIndex < endIndex) {
      ret[ret.length] = objectAt(this, beginIndex++);
    }

    return ret;
  },

  /**
    Returns the index of the given object's first occurrence.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, will count backward from
    the end of the array. Returns -1 if no match is found.

    ```javascript
    let arr = ['a', 'b', 'c', 'd', 'a'];

    arr.indexOf('a');       //  0
    arr.indexOf('z');       // -1
    arr.indexOf('a', 2);    //  4
    arr.indexOf('a', -1);   //  4
    arr.indexOf('b', 3);    // -1
    arr.indexOf('a', 100);  // -1
    ```

    @method indexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
    @public
  */

  indexOf(object, startAt) {
    return indexOf(this, object, startAt, false);
  },

  /**
    Returns the index of the given object's last occurrence.
    If no `startAt` argument is given, the search starts from
    the last position. If it's negative, will count backward
    from the end of the array. Returns -1 if no match is found.

    ```javascript
    let arr = ['a', 'b', 'c', 'd', 'a'];

    arr.lastIndexOf('a');       //  4
    arr.lastIndexOf('z');       // -1
    arr.lastIndexOf('a', 2);    //  0
    arr.lastIndexOf('a', -1);   //  4
    arr.lastIndexOf('b', 3);    //  1
    arr.lastIndexOf('a', 100);  //  4
    ```

    @method lastIndexOf
    @param {Object} object the item to search for
    @param {Number} startAt optional starting location to search, default 0
    @return {Number} index or -1 if not found
    @public
  */
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

  // ..........................................................
  // ARRAY OBSERVERS
  //

  /**
    Adds an array observer to the receiving array. The array observer object
    normally must implement two methods:

    * `arrayWillChange(observedObj, start, removeCount, addCount)` - This method will be
      called just before the array is modified.
    * `arrayDidChange(observedObj, start, removeCount, addCount)` - This method will be
      called just after the array is modified.

    Both callbacks will be passed the observed object, starting index of the
    change as well as a count of the items to be removed and added. You can use
    these callbacks to optionally inspect the array during the change, clear
    caches, or do any other bookkeeping necessary.

    In addition to passing a target, you can also include an options hash
    which you can use to override the method names that will be invoked on the
    target.

    @method addArrayObserver
    @param {Object} target The observer object.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {EmberArray} receiver
    @public
  */

  addArrayObserver(target, opts) {
    return addArrayObserver(this, target, opts);
  },

  /**
    Removes an array observer from the object if the observer is current
    registered. Calling this method multiple times with the same object will
    have no effect.

    @method removeArrayObserver
    @param {Object} target The object observing the array.
    @param {Object} opts Optional hash of configuration options including
      `willChange` and `didChange` option.
    @return {EmberArray} receiver
    @public
  */
  removeArrayObserver(target, opts) {
    return removeArrayObserver(this, target, opts);
  },

  /**
    Becomes true whenever the array currently has observers watching changes
    on the array.

    @property {Boolean} hasArrayObservers
    @public
  */
  hasArrayObservers: computed(function() {
    return hasListeners(this, '@array:change') || hasListeners(this, '@array:before');
  }),

  /**
    If you are implementing an object that supports `EmberArray`, call this
    method just before the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentWillChange
    @param {Number} startIdx The starting index in the array that will change.
    @param {Number} removeAmt The number of items that will be removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that will be added. If you
      pass `null` assumes 0.
    @return {EmberArray} receiver
    @public
  */
  arrayContentWillChange(startIdx, removeAmt, addAmt) {
    return arrayContentWillChange(this, startIdx, removeAmt, addAmt);
  },

  /**
    If you are implementing an object that supports `EmberArray`, call this
    method just after the array content changes to notify any observers and
    invalidate any related properties. Pass the starting index of the change
    as well as a delta of the amounts to change.

    @method arrayContentDidChange
    @param {Number} startIdx The starting index in the array that did change.
    @param {Number} removeAmt The number of items that were removed. If you
      pass `null` assumes 0
    @param {Number} addAmt The number of items that were added. If you
      pass `null` assumes 0.
    @return {EmberArray} receiver
    @public
  */
  arrayContentDidChange(startIdx, removeAmt, addAmt) {
    return arrayContentDidChange(this, startIdx, removeAmt, addAmt);
  },

  /**
    Iterates through the array, calling the passed function on each
    item. This method corresponds to the `forEach()` method defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method forEach
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Object} receiver
    @public
  */
  forEach(callback, target = null) {
    assert('forEach expects a function as first argument.', typeof callback === 'function');

    let length = this.length;

    for (let index = 0; index < length; index++) {
      let item = this.objectAt(index);
      callback.call(target, item, index, this);
    }

    return this;
  },

  /**
    Alias for `mapBy`

    @method getEach
    @param {String} key name of the property
    @return {Array} The mapped array.
    @public
  */
  getEach: aliasMethod('mapBy'),

  /**
    Sets the value on the named property for each member. This is more
    ergonomic than using other methods defined on this helper. If the object
    implements Observable, the value will be changed to `set(),` otherwise
    it will be set directly. `null` objects are skipped.

    @method setEach
    @param {String} key The key to set
    @param {Object} value The object to set
    @return {Object} receiver
    @public
  */
  setEach(key, value) {
    return this.forEach(item => set(item, key, value));
  },

  /**
    Maps all of the items in the enumeration to another value, returning
    a new array. This method corresponds to `map()` defined in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return the mapped value.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method map
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} The mapped array.
    @public
  */
  map(callback, target = null) {
    assert('map expects a function as first argument.', typeof callback === 'function');

    let ret = A();

    this.forEach((x, idx, i) => (ret[idx] = callback.call(target, x, idx, i)));

    return ret;
  },

  /**
    Similar to map, this specialized function returns the value of the named
    property on all items in the enumeration.

    @method mapBy
    @param {String} key name of the property
    @return {Array} The mapped array.
    @public
  */
  mapBy(key) {
    return this.map(next => get(next, key));
  },

  /**
    Returns an array with all of the items in the enumeration that the passed
    function returns true for. This method corresponds to `filter()` defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method filter
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} A filtered array.
    @public
  */
  filter(callback, target = null) {
    assert('filter expects a function as first argument.', typeof callback === 'function');

    let ret = A();

    this.forEach((x, idx, i) => {
      if (callback.call(target, x, idx, i)) {
        ret.push(x);
      }
    });

    return ret;
  },

  /**
    Returns an array with all of the items in the enumeration where the passed
    function returns false. This method is the inverse of filter().

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *array* is the array itself.

    It should return a falsey value to include the item in the results.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as "this" on the context. This is a good way
    to give your iterator function access to the current object.

    @method reject
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Array} A rejected array.
    @public
  */
  reject(callback, target = null) {
    assert('reject expects a function as first argument.', typeof callback === 'function');

    return this.filter(function() {
      return !callback.apply(target, arguments);
    });
  },

  /**
    Returns an array with just the items with the matched property. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    @method filterBy
    @param {String} key the property to test
    @param {*} [value] optional value to test against.
    @return {Array} filtered array
    @public
  */
  filterBy() {
    return this.filter(iter(...arguments));
  },

  /**
    Returns an array with the items that do not have truthy values for
    key.  You can pass an optional second argument with the target value.  Otherwise
    this will match any property that evaluates to false.

    @method rejectBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Array} rejected array
    @public
  */
  rejectBy() {
    return this.reject(iter(...arguments));
  },

  /**
    Returns the first item in the array for which the callback returns true.
    This method is similar to the `find()` method defined in ECMAScript 2015.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return the `true` to include the item in the results, `false`
    otherwise.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method find
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Object} Found item or `undefined`.
    @public
  */
  find(callback, target = null) {
    assert('find expects a function as first argument.', typeof callback === 'function');

    let length = this.length;

    for (let index = 0; index < length; index++) {
      let item = this.objectAt(index);

      if (callback.call(target, item, index, this)) {
        return item;
      }
    }
  },

  /**
    Returns the first item with a property matching the passed value. You
    can pass an optional second argument with the target value. Otherwise
    this will match any property that evaluates to `true`.

    This method works much like the more generic `find()` method.

    @method findBy
    @param {String} key the property to test
    @param {String} [value] optional value to test against.
    @return {Object} found item or `undefined`
    @public
  */
  findBy() {
    return this.find(iter(...arguments));
  },

  /**
    Returns `true` if the passed function returns true for every item in the
    enumeration. This corresponds with the `every()` method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    It should return the `true` or `false`.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    Example Usage:

    ```javascript
    if (people.every(isEngineer)) {
      Paychecks.addBigBonus();
    }
    ```

    @method every
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Boolean}
    @public
  */
  every(callback, target = null) {
    assert('every expects a function as first argument.', typeof callback === 'function');

    return !this.find((x, idx, i) => !callback.call(target, x, idx, i));
  },

  /**
    Returns `true` if the passed property resolves to the value of the second
    argument for all items in the array. This method is often simpler/faster
    than using a callback.

    Note that like the native `Array.every`, `isEvery` will return true when called
    on any empty array.

    @method isEvery
    @param {String} key the property to test
    @param {String} [value] optional value to test against. Defaults to `true`
    @return {Boolean}
    @since 1.3.0
    @public
  */
  isEvery() {
    return this.every(iter(...arguments));
  },

  /**
    Returns `true` if the passed function returns true for any item in the
    enumeration.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, array);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array object itself.

    It must return a truthy value (i.e. `true`) to include an item in the
    results. Any non-truthy return value will discard the item from the
    results.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    Usage Example:

    ```javascript
    if (people.any(isManager)) {
      Paychecks.addBiggerBonus();
    }
    ```

    @method any
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Boolean} `true` if the passed function returns `true` for any item
    @public
  */
  any(callback, target = null) {
    assert('any expects a function as first argument.', typeof callback === 'function');

    let length = this.length;

    for (let index = 0; index < length; index++) {
      let item = this.objectAt(index);

      if (callback.call(target, item, index, this)) {
        return true;
      }
    }

    return false;
  },

  /**
    Returns `true` if the passed property resolves to the value of the second
    argument for any item in the array. This method is often simpler/faster
    than using a callback.

    @method isAny
    @param {String} key the property to test
    @param {String} [value] optional value to test against. Defaults to `true`
    @return {Boolean}
    @since 1.3.0
    @public
  */
  isAny() {
    return this.any(iter(...arguments));
  },

  /**
    This will combine the values of the enumerator into a single value. It
    is a useful way to collect a summary value from an enumeration. This
    corresponds to the `reduce()` method defined in JavaScript 1.8.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(previousValue, item, index, array);
    ```

    - `previousValue` is the value returned by the last call to the iterator.
    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `array` is the array itself.

    Return the new cumulative value.

    In addition to the callback you can also pass an `initialValue`. An error
    will be raised if you do not pass an initial value and the enumerator is
    empty.

    Note that unlike the other methods, this method does not allow you to
    pass a target object to set as this for the callback. It's part of the
    spec. Sorry.

    @method reduce
    @param {Function} callback The callback to execute
    @param {Object} initialValue Initial value for the reduce
    @param {String} reducerProperty internal use only.
    @return {Object} The reduced value.
    @public
  */
  reduce(callback, initialValue, reducerProperty) {
    assert('reduce expects a function as first argument.', typeof callback === 'function');

    let ret = initialValue;

    this.forEach(function(item, i) {
      ret = callback(ret, item, i, this, reducerProperty);
    }, this);

    return ret;
  },

  /**
    Invokes the named method on every object in the receiver that
    implements it. This method corresponds to the implementation in
    Prototype 1.6.

    @method invoke
    @param {String} methodName the name of the method
    @param {Object...} args optional arguments to pass as well.
    @return {Array} return values from calling invoke.
    @public
  */
  invoke(methodName, ...args) {
    let ret = A();

    this.forEach((x, idx) => {
      let method = x && x[methodName];

      if ('function' === typeof method) {
        ret[idx] = args.length ? method.apply(x, args) : x[methodName]();
      }
    }, this);

    return ret;
  },

  /**
    Simply converts the object into a genuine array. The order is not
    guaranteed. Corresponds to the method implemented by Prototype.

    @method toArray
    @return {Array} the object as an array.
    @public
  */
  toArray() {
    return this.map(item => item);
  },

  /**
    Returns a copy of the array with all `null` and `undefined` elements removed.

    ```javascript
    let arr = ['a', null, 'c', undefined];
    arr.compact();  // ['a', 'c']
    ```

    @method compact
    @return {Array} the array without null and undefined elements.
    @public
  */
  compact() {
    return this.filter(value => value != null);
  },

  /**
    Returns `true` if the passed object can be found in the array.
    This method is a Polyfill for ES 2016 Array.includes.
    If no `startAt` argument is given, the starting location to
    search is 0. If it's negative, searches from the index of
    `this.length + startAt` by asc.

    ```javascript
    [1, 2, 3].includes(2);     // true
    [1, 2, 3].includes(4);     // false
    [1, 2, 3].includes(3, 2);  // true
    [1, 2, 3].includes(3, 3);  // false
    [1, 2, 3].includes(3, -1); // true
    [1, 2, 3].includes(1, -1); // false
    [1, 2, 3].includes(1, -4); // true
    [1, 2, NaN].includes(NaN); // true
    ```

    @method includes
    @param {Object} object The object to search for.
    @param {Number} startAt optional starting location to search, default 0
    @return {Boolean} `true` if object is found in the array.
    @public
  */
  includes(object, startAt) {
    return indexOf(this, object, startAt, true) !== -1;
  },

  /**
    Converts the array into an array and sorts by the keys
    specified in the argument.

    You may provide multiple arguments to sort by multiple properties.

    @method sortBy
    @param {String} property name(s) to sort on
    @return {Array} The sorted array.
    @since 1.2.0
    @public
  */
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

  /**
    Returns a new array that contains only unique values. The default
    implementation returns an array regardless of the receiver type.

    ```javascript
    let arr = ['a', 'a', 'b', 'b'];
    arr.uniq();  // ['a', 'b']
    ```

    This only works on primitive data types, e.g. Strings, Numbers, etc.

    @method uniq
    @return {EmberArray}
    @public
  */
  uniq() {
    return uniqBy(this);
  },

  /**
    Returns a new array that contains only items containing a unique property value.
    The default implementation returns an array regardless of the receiver type.

    ```javascript
    let arr = [{ value: 'a' }, { value: 'a' }, { value: 'b' }, { value: 'b' }];
    arr.uniqBy('value');  // [{ value: 'a' }, { value: 'b' }]

    let arr = [2.2, 2.1, 3.2, 3.3];
    arr.uniqBy(Math.floor);  // [2.2, 3.2];
    ```

    @method uniqBy
    @param {String,Function} key
    @return {EmberArray}
    @public
  */

  uniqBy(key) {
    return uniqBy(this, key);
  },

  /**
    Returns a new array that excludes the passed value. The default
    implementation returns an array regardless of the receiver type.
    If the receiver does not contain the value it returns the original array.

    ```javascript
    let arr = ['a', 'b', 'a', 'c'];
    arr.without('a');  // ['b', 'c']
    ```

    @method without
    @param {Object} value
    @return {EmberArray}
    @public
  */
  without(value) {
    if (!this.includes(value)) {
      return this; // nothing to do
    }

    // SameValueZero comparison (NaN !== NaN)
    let predicate = value === value ? item => item !== value : item => item === item;
    return this.filter(predicate);
  },

  /**
    Returns a special object that can be used to observe individual properties
    on the array. Just get an equivalent property on this object and it will
    return an array that maps automatically to the named key on the
    member objects.

    `@each` should only be used in a non-terminal context. Example:

    ```javascript
    myMethod: computed('posts.@each.author', function(){
      ...
    });
    ```

    If you merely want to watch for the array being changed, like an object being
    replaced, added or removed, use `[]` instead of `@each`.

    ```javascript
    myMethod: computed('posts.[]', function(){
      ...
    });
    ```

    @property @each
    @public
  */
  '@each': computed(function() {
    deprecate(`Getting the '@each' property on object ${toString(this)} is deprecated`, false, {
      id: 'ember-metal.getting-each',
      until: '3.5.0',
      url: 'https://emberjs.com/deprecations/v3.x#toc_getting-the-each-property',
    });

    return eachProxyFor(this);
  }).readOnly(),
});

const OUT_OF_RANGE_EXCEPTION = 'Index out of range';

export function removeAt(array, start, len) {
  if ('number' === typeof start) {
    if (start < 0 || start >= array.length) {
      throw new EmberError(OUT_OF_RANGE_EXCEPTION);
    }

    // fast case
    if (len === undefined) {
      len = 1;
    }

    array.replace(start, len, EMPTY_ARRAY);
  }

  return array;
}

/**
  This mixin defines the API for modifying array-like objects. These methods
  can be applied only to a collection that keeps its items in an ordered set.
  It builds upon the Array mixin and adds methods to modify the array.
  One concrete implementations of this class include ArrayProxy.

  It is important to use the methods in this class to modify arrays so that
  changes are observable. This allows the binding system in Ember to function
  correctly.


  Note that an Array can change even if it does not implement this mixin.
  For example, one might implement a SparseArray that cannot be directly
  modified, but if its underlying enumerable changes, it will change also.

  @class MutableArray
  @uses EmberArray
  @uses MutableEnumerable
  @public
*/

const MutableArray = Mixin.create(ArrayMixin, MutableEnumerable, {
  /**
    __Required.__ You must implement this method to apply this mixin.

    This is one of the primitives you must implement to support `Array`.
    You should replace amt objects started at idx with the objects in the
    passed array. You should also call `this.arrayContentDidChange()`

    @method replace
    @param {Number} idx Starting index in the array to replace. If
      idx >= length, then append to the end of the array.
    @param {Number} amt Number of elements that should be removed from
      the array, starting at *idx*.
    @param {EmberArray} objects An array of zero or more objects that should be
      inserted into the array at *idx*
    @public
  */
  replace: null,

  /**
    Remove all elements from the array. This is useful if you
    want to reuse an existing array without having to recreate it.

    ```javascript
    let colors = ['red', 'green', 'blue'];

    colors.length;  // 3
    colors.clear(); // []
    colors.length;  // 0
    ```

    @method clear
    @return {Array} An empty Array.
    @public
  */
  clear() {
    let len = this.length;
    if (len === 0) {
      return this;
    }

    this.replace(0, len, EMPTY_ARRAY);
    return this;
  },

  /**
    This will use the primitive `replace()` method to insert an object at the
    specified index.

    ```javascript
    let colors = ['red', 'green', 'blue'];

    colors.insertAt(2, 'yellow');  // ['red', 'green', 'yellow', 'blue']
    colors.insertAt(5, 'orange');  // Error: Index out of range
    ```

    @method insertAt
    @param {Number} idx index of insert the object at.
    @param {Object} object object to insert
    @return {EmberArray} receiver
    @public
  */
  insertAt(idx, object) {
    if (idx > this.length) {
      throw new EmberError(OUT_OF_RANGE_EXCEPTION);
    }

    this.replace(idx, 0, [object]);
    return this;
  },

  /**
    Remove an object at the specified index using the `replace()` primitive
    method. You can pass either a single index, or a start and a length.

    If you pass a start and length that is beyond the
    length this method will throw an `OUT_OF_RANGE_EXCEPTION`.

    ```javascript
    let colors = ['red', 'green', 'blue', 'yellow', 'orange'];

    colors.removeAt(0);     // ['green', 'blue', 'yellow', 'orange']
    colors.removeAt(2, 2);  // ['green', 'blue']
    colors.removeAt(4, 2);  // Error: Index out of range
    ```

    @method removeAt
    @param {Number} start index, start of range
    @param {Number} len length of passing range
    @return {EmberArray} receiver
    @public
  */
  removeAt(start, len) {
    return removeAt(this, start, len);
  },

  /**
    Push the object onto the end of the array. Works just like `push()` but it
    is KVO-compliant.

    ```javascript
    let colors = ['red', 'green'];

    colors.pushObject('black');     // ['red', 'green', 'black']
    colors.pushObject(['yellow']);  // ['red', 'green', ['yellow']]
    ```

    @method pushObject
    @param {*} obj object to push
    @return object same object passed as a param
    @public
  */
  pushObject(obj) {
    this.insertAt(this.length, obj);
    return obj;
  },

  /**
    Add the objects in the passed array to the end of the array. Defers
    notifying observers of the change until all objects are added.

    ```javascript
    let colors = ['red'];

    colors.pushObjects(['yellow', 'orange']);  // ['red', 'yellow', 'orange']
    ```

    @method pushObjects
    @param {EmberArray} objects the objects to add
    @return {EmberArray} receiver
    @public
  */
  pushObjects(objects) {
    if (!Array.isArray(objects)) {
      throw new TypeError('Must pass Enumerable to MutableArray#pushObjects');
    }
    this.replace(this.length, 0, objects);
    return this;
  },

  /**
    Pop object from array or nil if none are left. Works just like `pop()` but
    it is KVO-compliant.

    ```javascript
    let colors = ['red', 'green', 'blue'];

    colors.popObject();   // 'blue'
    console.log(colors);  // ['red', 'green']
    ```

    @method popObject
    @return object
    @public
  */
  popObject() {
    let len = this.length;
    if (len === 0) {
      return null;
    }

    let ret = objectAt(this, len - 1);
    this.removeAt(len - 1, 1);
    return ret;
  },

  /**
    Shift an object from start of array or nil if none are left. Works just
    like `shift()` but it is KVO-compliant.

    ```javascript
    let colors = ['red', 'green', 'blue'];

    colors.shiftObject();  // 'red'
    console.log(colors);   // ['green', 'blue']
    ```

    @method shiftObject
    @return object
    @public
  */
  shiftObject() {
    if (this.length === 0) {
      return null;
    }

    let ret = objectAt(this, 0);
    this.removeAt(0);
    return ret;
  },

  /**
    Unshift an object to start of array. Works just like `unshift()` but it is
    KVO-compliant.

    ```javascript
    let colors = ['red'];

    colors.unshiftObject('yellow');    // ['yellow', 'red']
    colors.unshiftObject(['black']);   // [['black'], 'yellow', 'red']
    ```

    @method unshiftObject
    @param {*} obj object to unshift
    @return object same object passed as a param
    @public
  */
  unshiftObject(obj) {
    this.insertAt(0, obj);
    return obj;
  },

  /**
    Adds the named objects to the beginning of the array. Defers notifying
    observers until all objects have been added.

    ```javascript
    let colors = ['red'];

    colors.unshiftObjects(['black', 'white']);   // ['black', 'white', 'red']
    colors.unshiftObjects('yellow'); // Type Error: 'undefined' is not a function
    ```

    @method unshiftObjects
    @param {Enumberable} objects the objects to add
    @return {EmberArray} receiver
    @public
  */
  unshiftObjects(objects) {
    this.replace(0, 0, objects);
    return this;
  },

  /**
    Reverse objects in the array. Works just like `reverse()` but it is
    KVO-compliant.

    @method reverseObjects
    @return {EmberArray} receiver
     @public
  */
  reverseObjects() {
    let len = this.length;
    if (len === 0) {
      return this;
    }

    let objects = this.toArray().reverse();
    this.replace(0, len, objects);
    return this;
  },

  /**
    Replace all the receiver's content with content of the argument.
    If argument is an empty array receiver will be cleared.

    ```javascript
    let colors = ['red', 'green', 'blue'];

    colors.setObjects(['black', 'white']);  // ['black', 'white']
    colors.setObjects([]);                  // []
    ```

    @method setObjects
    @param {EmberArray} objects array whose content will be used for replacing
        the content of the receiver
    @return {EmberArray} receiver with the new content
    @public
  */
  setObjects(objects) {
    if (objects.length === 0) {
      return this.clear();
    }

    let len = this.length;
    this.replace(0, len, objects);
    return this;
  },

  /**
    Remove all occurrences of an object in the array.

    ```javascript
    let cities = ['Chicago', 'Berlin', 'Lima', 'Chicago'];

    cities.removeObject('Chicago');  // ['Berlin', 'Lima']
    cities.removeObject('Lima');     // ['Berlin']
    cities.removeObject('Tokyo')     // ['Berlin']
    ```

    @method removeObject
    @param {*} obj object to remove
    @return {EmberArray} receiver
    @public
  */
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

  /**
    Removes each object in the passed array from the receiver.

    @method removeObjects
    @param {EmberArray} objects the objects to remove
    @return {EmberArray} receiver
    @public
  */
  removeObjects(objects) {
    beginPropertyChanges(this);
    for (let i = objects.length - 1; i >= 0; i--) {
      this.removeObject(objects[i]);
    }
    endPropertyChanges(this);
    return this;
  },

  /**
    Push the object onto the end of the array if it is not already
    present in the array.

    ```javascript
    let cities = ['Chicago', 'Berlin'];

    cities.addObject('Lima');    // ['Chicago', 'Berlin', 'Lima']
    cities.addObject('Berlin');  // ['Chicago', 'Berlin', 'Lima']
    ```

    @method addObject
    @param {*} obj object to add, if not already present
    @return {EmberArray} receiver
    @public
  */
  addObject(obj) {
    let included = this.includes(obj);

    if (!included) {
      this.pushObject(obj);
    }

    return this;
  },

  /**
    Adds each object in the passed array to the receiver.

    @method addObjects
    @param {EmberArray} objects the objects to add.
    @return {EmberArray} receiver
    @public
  */
  addObjects(objects) {
    beginPropertyChanges(this);
    objects.forEach(obj => this.addObject(obj));
    endPropertyChanges(this);
    return this;
  },
});

/**
  Creates an `Ember.NativeArray` from an Array-like object.
  Does not modify the original object's contents. `A()` is not needed if
  `EmberENV.EXTEND_PROTOTYPES` is `true` (the default value). However,
  it is recommended that you use `A()` when creating addons for
  ember or when you can not guarantee that `EmberENV.EXTEND_PROTOTYPES`
  will be `true`.

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
/**
  The NativeArray mixin contains the properties needed to make the native
  Array support MutableArray and all of its dependent APIs. Unless you
  have `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Array` set to
  false, this will be applied automatically. Otherwise you can apply the mixin
  at anytime by calling `Ember.NativeArray.apply(Array.prototype)`.

  @class Ember.NativeArray
  @uses MutableArray
  @uses Observable
  @uses Ember.Copyable
  @public
*/
let NativeArray = Mixin.create(MutableArray, Observable, Copyable, {
  objectAt(idx) {
    return this[idx];
  },

  // primitive for array support.
  replace(start, deleteCount, items = EMPTY_ARRAY) {
    assert('The third argument to replace needs to be an array.', Array.isArray(items));

    replaceInNativeArray(this, start, deleteCount, items);

    return this;
  },

  indexOf: Array.prototype.indexOf,
  lastIndexOf: Array.prototype.lastIndexOf,

  copy(deep) {
    if (deep) {
      return this.map(item => copy(item, true));
    }

    return this.slice();
  },
});

// Remove any methods implemented natively so we don't override them
const ignore = ['length'];
NativeArray.keys().forEach(methodName => {
  if (Array.prototype[methodName]) {
    ignore.push(methodName);
  }
});

NativeArray = NativeArray.without(...ignore);

let A;

if (ENV.EXTEND_PROTOTYPES.Array) {
  NativeArray.apply(Array.prototype);
  A = arr => arr || [];
} else {
  A = arr => {
    if (!arr) {
      arr = [];
    }
    return ArrayMixin.detect(arr) ? arr : NativeArray.apply(arr);
  };
}

export { A, NativeArray, MutableArray };

export default ArrayMixin;
