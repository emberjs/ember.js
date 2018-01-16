/**
@module @ember/array
*/

import { symbol, toString } from 'ember-utils';
import {
  get,
  set,
  computed,
  isNone,
  aliasMethod,
  Mixin,
  propertyWillChange,
  propertyDidChange,
  addListener,
  removeListener,
  sendEvent,
  hasListeners,
  _addBeforeObserver,
  _removeBeforeObserver,
  addObserver,
  removeObserver,
  meta,
  peekMeta
} from 'ember-metal';
import { assert } from 'ember-debug';
import Enumerable from './enumerable';
import compare from '../compare';
import require from 'require';


// Required to break a module cycle
let _A;
function A() {
  if (_A === undefined) {
    _A = require('ember-runtime/system/native_array').A;
  }
  return _A();
}

function arrayObserversHelper(obj, target, opts, operation, notify) {
  let willChange = (opts && opts.willChange) || 'arrayWillChange';
  let didChange  = (opts && opts.didChange) || 'arrayDidChange';
  let hasObservers = get(obj, 'hasArrayObservers');

  if (hasObservers === notify) {
    propertyWillChange(obj, 'hasArrayObservers');
  }

  operation(obj, '@array:before', target, willChange);
  operation(obj, '@array:change', target, didChange);

  if (hasObservers === notify) {
    propertyDidChange(obj, 'hasArrayObservers');
  }

  return obj;
}

export function addArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, addListener, false);
}

export function removeArrayObserver(array, target, opts) {
  return arrayObserversHelper(array, target, opts, removeListener, true);
}

export function objectAt(content, idx) {
  return typeof content.objectAt === 'function' ? content.objectAt(idx) : content[idx];
}

export function arrayContentWillChange(array, startIdx, removeAmt, addAmt) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }

    if (addAmt === undefined) {
      addAmt = -1;
    }
  }

  if (array.__each) {
    array.__each.arrayWillChange(array, startIdx, removeAmt, addAmt);
  }

  sendEvent(array, '@array:before', [array, startIdx, removeAmt, addAmt]);

  propertyWillChange(array, '[]');

  if (addAmt < 0 || removeAmt < 0 || addAmt - removeAmt !== 0) {
    propertyWillChange(array, 'length');
  }

  return array;
}

export function arrayContentDidChange(array, startIdx, removeAmt, addAmt) {
  // if no args are passed assume everything changes
  if (startIdx === undefined) {
    startIdx = 0;
    removeAmt = addAmt = -1;
  } else {
    if (removeAmt === undefined) {
      removeAmt = -1;
    }

    if (addAmt === undefined) {
      addAmt = -1;
    }
  }

  if (addAmt < 0 || removeAmt < 0 || addAmt - removeAmt !== 0) {
    propertyDidChange(array, 'length');
  }

  propertyDidChange(array, '[]');

  if (array.__each) {
    array.__each.arrayDidChange(array, startIdx, removeAmt, addAmt);
  }

  sendEvent(array, '@array:change', [array, startIdx, removeAmt, addAmt]);

  let meta = peekMeta(array);
  let cache = meta !== undefined ? meta.readableCache() : undefined;
  if (cache !== undefined) {
    let length = get(array, 'length');
    let addedAmount = (addAmt === -1 ? 0 : addAmt);
    let removedAmount = (removeAmt === -1 ? 0 : removeAmt);
    let delta = addedAmount - removedAmount;
    let previousLength = length - delta;

    let normalStartIdx = startIdx < 0 ? previousLength + startIdx : startIdx;
    if (cache.firstObject !== undefined && normalStartIdx === 0) {
      propertyWillChange(array, 'firstObject', meta);
      propertyDidChange(array, 'firstObject', meta);
    }

    if (cache.lastObject !== undefined) {
      let previousLastIndex = previousLength - 1;
      let lastAffectedIndex = normalStartIdx + removedAmount;
      if (previousLastIndex < lastAffectedIndex) {
        propertyWillChange(array, 'lastObject', meta);
        propertyDidChange(array, 'lastObject', meta);
      }
   }
  }

  return array;
}

const EMBER_ARRAY = symbol('EMBER_ARRAY');

export function isEmberArray(obj) {
  return obj && obj[EMBER_ARRAY];
}

const contexts = [];

function popCtx() {
  return contexts.length === 0 ? {} : contexts.pop();
}

function pushCtx(ctx) {
  contexts.push(ctx);
  return null;
}

function iter(key, value) {
  let valueProvided = arguments.length === 2;

  return valueProvided ?
    (item)=> value === get(item, key) :
    (item)=> !!get(item, key);
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

  Unlike `Enumerable,` this mixin defines methods specifically for
  collections that provide index-ordered access to their contents. When you
  are designing code that needs to accept any kind of Array-like object, you
  should use these methods instead of Array primitives because these will
  properly notify observers of changes to the array.

  Although these methods are efficient, they do add a layer of indirection to
  your application so it is a good idea to use them only when you need the
  flexibility of using both true JavaScript arrays and "virtual" arrays such
  as controllers and collections.

  You can use the methods defined in this module to access and modify array
  contents in a KVO-friendly way. You can also be notified whenever the
  membership of an array changes by using `.observes('myArray.[]')`.

  To support `EmberArray` in your own class, you must override two
  primitives to use it: `length()` and `objectAt()`.

  Note that the EmberArray mixin also incorporates the `Enumerable`
  mixin. All `EmberArray`-like objects are also enumerable.

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
    if (idx < 0 || idx >= get(this, 'length')) {
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

    This property overrides the default property defined in `Enumerable`.

    @property []
    @return this
    @public
  */
  '[]': computed({
    get(key) {   // eslint-disable-line no-unused-vars
      return this;
    },
    set(key, value) {
      this.replace(0, get(this, 'length'), value);
      return this;
    }
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
    return objectAt(this, get(this, 'length') - 1);
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
  slice(beginIndex, endIndex) {
    let ret = A();
    let length = get(this, 'length');

    if (isNone(beginIndex)) {
      beginIndex = 0;
    } else if (beginIndex < 0) {
      beginIndex = length + beginIndex;
    }

    if (isNone(endIndex) || (endIndex > length)) {
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
    let len = get(this, 'length');

    if (startAt === undefined) {
      startAt = 0;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx < len; idx++) {
      if (objectAt(this, idx) === object) {
        return idx;
      }
    }

    return -1;
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
    let len = get(this, 'length');

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
    Iterates through the enumerable, calling the passed function on each
    item. This method corresponds to the `forEach()` method defined in
    JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

    Note that in addition to a callback, you can also pass an optional target
    object that will be set as `this` on the context. This is a good way
    to give your iterator function access to the current object.

    @method forEach
    @param {Function} callback The callback to execute
    @param {Object} [target] The target object to use
    @return {Object} receiver
    @public
  */
  forEach(callback, target) {
    assert('Enumerable#forEach expects a function as first argument.', typeof callback === 'function');

    let context = popCtx();
    let len = get(this, 'length');
    let last = null;

    if (target === undefined) {
      target = null;
    }

    for (let idx = 0; idx < len; idx++) {
      let next = this.nextObject(idx, last, context);
      callback.call(target, next, idx, this);
      last = next;
    }

    last = null;
    context = pushCtx(context);

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
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
  map(callback, target) {
    assert('Enumerable#map expects a function as first argument.', typeof callback === 'function');

    let ret = A();

    this.forEach((x, idx, i) => ret[idx] = callback.call(target, x, idx, i));

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
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
  filter(callback, target) {
    assert('Enumerable#filter expects a function as first argument.', typeof callback === 'function');

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
    function(item, index, enumerable);
    ```

    - *item* is the current item in the iteration.
    - *index* is the current index in the iteration
    - *enumerable* is the enumerable object itself.

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
  reject(callback, target) {
    assert('Enumerable#reject expects a function as first argument.', typeof callback === 'function');

    return this.filter(function() {
      return !(callback.apply(target, arguments));
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
  filterBy(key, value) { // eslint-disable-line no-unused-vars
    return this.filter(iter.apply(this, arguments));
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
  rejectBy(key, value) {
    let exactValue = item => get(item, key) === value;
    let hasValue = item  => !!get(item, key);
    let use = (arguments.length === 2 ? exactValue : hasValue);

    return this.reject(use);
  },

  /**
    Returns the first item in the array for which the callback returns true.
    This method works similar to the `filter()` method defined in JavaScript 1.6
    except that it will stop working on the array once a match is found.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
  find(callback, target) {
    assert('Enumerable#find expects a function as first argument.', typeof callback === 'function');

    let len = get(this, 'length');

    if (target === undefined) {
      target = null;
    }

    let context = popCtx();
    let found = false;
    let last = null;
    let next, ret;

    for (let idx = 0; idx < len && !found; idx++) {
      next = this.nextObject(idx, last, context);

      found = callback.call(target, next, idx, this);
      if (found) {
        ret = next;
      }

      last = next;
    }

    next = last = null;
    context = pushCtx(context);

    return ret;
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
  findBy(key, value) {  // eslint-disable-line no-unused-vars
    return this.find(iter.apply(this, arguments));
  },

  /**
    Returns `true` if the passed function returns true for every item in the
    enumeration. This corresponds with the `every()` method in JavaScript 1.6.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
  every(callback, target) {
    assert('Enumerable#every expects a function as first argument.', typeof callback === 'function');

    return !this.find((x, idx, i) => !callback.call(target, x, idx, i));
  },

  /**
    Returns `true` if the passed property resolves to the value of the second
    argument for all items in the enumerable. This method is often simpler/faster
    than using a callback.

    Note that like the native `Array.every`, `isEvery` will return true when called
    on any empty enumerable.

    @method isEvery
    @param {String} key the property to test
    @param {String} [value] optional value to test against. Defaults to `true`
    @return {Boolean}
    @since 1.3.0
    @public
  */
  isEvery(key, value) {  // eslint-disable-line no-unused-vars
    return this.every(iter.apply(this, arguments));
  },

  /**
    Returns `true` if the passed function returns true for any item in the
    enumeration.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(item, index, enumerable);
    ```

    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
  any(callback, target) {
    assert('Enumerable#any expects a function as first argument.', typeof callback === 'function');

    let len = get(this, 'length');
    let context = popCtx();
    let found = false;
    let last = null;
    let next;

    if (target === undefined) {
      target = null;
    }

    for (let idx = 0; idx < len && !found; idx++) {
      next  = this.nextObject(idx, last, context);
      found = callback.call(target, next, idx, this);
      last  = next;
    }

    next = last = null;
    context = pushCtx(context);
    return found;
  },

  /**
    Returns `true` if the passed property resolves to the value of the second
    argument for any item in the enumerable. This method is often simpler/faster
    than using a callback.

    @method isAny
    @param {String} key the property to test
    @param {String} [value] optional value to test against. Defaults to `true`
    @return {Boolean}
    @since 1.3.0
    @public
  */
  isAny(key, value) {  // eslint-disable-line no-unused-vars
    return this.any(iter.apply(this, arguments));
  },

  /**
    This will combine the values of the enumerator into a single value. It
    is a useful way to collect a summary value from an enumeration. This
    corresponds to the `reduce()` method defined in JavaScript 1.8.

    The callback method you provide should have the following signature (all
    parameters are optional):

    ```javascript
    function(previousValue, item, index, enumerable);
    ```

    - `previousValue` is the value returned by the last call to the iterator.
    - `item` is the current item in the iteration.
    - `index` is the current index in the iteration.
    - `enumerable` is the enumerable object itself.

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
    assert('Enumerable#reduce expects a function as first argument.', typeof callback === 'function');

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
    Simply converts the enumerable into a genuine array. The order is not
    guaranteed. Corresponds to the method implemented by Prototype.

    @method toArray
    @return {Array} the enumerable as an array.
    @public
  */
  toArray() {
    let ret = A();

    this.forEach((o, idx) => ret[idx] = o);

    return ret;
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
    @param {Object} obj The object to search for.
    @param {Number} startAt optional starting location to search, default 0
    @return {Boolean} `true` if object is found in the array.
    @public
  */
  includes(obj, startAt) {
    let len = get(this, 'length');

    if (startAt === undefined) {
      startAt = 0;
    }

    if (startAt < 0) {
      startAt += len;
    }

    for (let idx = startAt; idx < len; idx++) {
      let currentObj = objectAt(this, idx);

      // SameValueZero comparison (NaN !== NaN)
      if (obj === currentObj || (obj !== obj && currentObj !== currentObj)) {
        return true;
      }
    }

    return false;
  },

  /**
    Converts the enumerable into an array and sorts by the keys
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
    Returns a new enumerable that contains only unique values. The default
    implementation returns an array regardless of the receiver type.

    ```javascript
    let arr = ['a', 'a', 'b', 'b'];
    arr.uniq();  // ['a', 'b']
    ```

    This only works on primitive data types, e.g. Strings, Numbers, etc.

    @method uniq
    @return {Enumerable}
    @public
  */
  uniq() {
    let ret = A();

    let seen = new Set();
    this.forEach(item => {
      if (!seen.has(item)) {
        seen.add(item);
        ret.push(item);
      }
    });

    return ret;
  },

  /**
    Returns a new enumerable that contains only items containing a unique property value.
    The default implementation returns an array regardless of the receiver type.

    ```javascript
    let arr = [{ value: 'a' }, { value: 'a' }, { value: 'b' }, { value: 'b' }];
    arr.uniqBy('value');  // [{ value: 'a' }, { value: 'b' }]
    ```

    @method uniqBy
    @return {Enumerable}
    @public
  */

  uniqBy(key) {
    let ret = A();
    let seen = new Set();

    this.forEach((item) => {
      let val = get(item, key);
      if (!seen.has(val)) {
        seen.add(val);
        ret.push(item);
      }
    });

    return ret;
  },

  /**
    Returns a new enumerable that excludes the passed value. The default
    implementation returns an array regardless of the receiver type.
    If the receiver does not contain the value it returns the original enumerable.

    ```javascript
    let arr = ['a', 'b', 'a', 'c'];
    arr.without('a');  // ['b', 'c']
    ```

    @method without
    @param {Object} value
    @return {Enumerable}
    @public
  */
  without(value) {
    if (!this.includes(value)) {
      return this; // nothing to do
    }

    let ret = A();

    this.forEach(k => {
      // SameValueZero comparison (NaN !== NaN)
      if (!(k === value || k !== k && value !== value)) {
        ret[ret.length] = k;
      }
    });

    return ret;
  },

  /**
    Returns a special object that can be used to observe individual properties
    on the array. Just get an equivalent property on this object and it will
    return an enumerable that maps automatically to the named key on the
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
    // TODO use Symbol or add to meta
    if (!this.__each) {
      this.__each = new EachProxy(this);
    }

    return this.__each;
  }).volatile().readOnly()
});

/**
  This is the object instance returned when you get the `@each` property on an
  array. It uses the unknownProperty handler to automatically create
  EachArray instances for property names.
  @class EachProxy
  @private
*/
function EachProxy(content) {
  this._content = content;
  this._keys = undefined;
  meta(this);
}

EachProxy.prototype = {
  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  },

  // ..........................................................
  // ARRAY CHANGES
  // Invokes whenever the content array itself changes.

  arrayWillChange(content, idx, removedCnt, addedCnt) {   // eslint-disable-line no-unused-vars
    let keys = this._keys;
    let lim = removedCnt > 0 ? idx + removedCnt : -1;
    let meta = peekMeta(this);
    for (let key in keys) {
      if (lim > 0) {
        removeObserverForContentKey(content, key, this, idx, lim);
      }
      propertyWillChange(this, key, meta);
    }
  },

  arrayDidChange(content, idx, removedCnt, addedCnt) {
    let keys = this._keys;
    let lim = addedCnt > 0 ? idx + addedCnt : -1;
    let meta = peekMeta(this);
    for (let key in keys) {
      if (lim > 0) {
        addObserverForContentKey(content, key, this, idx, lim);
      }
      propertyDidChange(this, key, meta);
    }
  },

  // ..........................................................
  // LISTEN FOR NEW OBSERVERS AND OTHER EVENT LISTENERS
  // Start monitoring keys based on who is listening...

  willWatchProperty(property) {
    this.beginObservingContentKey(property);
  },

  didUnwatchProperty(property) {
    this.stopObservingContentKey(property);
  },

  // ..........................................................
  // CONTENT KEY OBSERVING
  // Actual watch keys on the source content.

  beginObservingContentKey(keyName) {
    let keys = this._keys;
    if (!keys) {
      keys = this._keys = Object.create(null);
    }

    if (!keys[keyName]) {
      keys[keyName] = 1;
      let content = this._content;
      let len = get(content, 'length');

      addObserverForContentKey(content, keyName, this, 0, len);
    } else {
      keys[keyName]++;
    }
  },

  stopObservingContentKey(keyName) {
    let keys = this._keys;
    if (keys && (keys[keyName] > 0) && (--keys[keyName] <= 0)) {
      let content = this._content;
      let len     = get(content, 'length');

      removeObserverForContentKey(content, keyName, this, 0, len);
    }
  },

  contentKeyWillChange(obj, keyName) {
    propertyWillChange(this, keyName);
  },

  contentKeyDidChange(obj, keyName) {
    propertyDidChange(this, keyName);
  }
};

function addObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      assert(`When using @each to observe the array \`${toString(content)}\`, the array must return an object`, typeof item === 'object');
      _addBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      addObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

function removeObserverForContentKey(content, keyName, proxy, idx, loc) {
  while (--loc >= idx) {
    let item = objectAt(content, loc);
    if (item) {
      _removeBeforeObserver(item, keyName, proxy, 'contentKeyWillChange');
      removeObserver(item, keyName, proxy, 'contentKeyDidChange');
    }
  }
}

export default ArrayMixin;
