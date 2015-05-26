import {
  filter as _filter,
  forEach as a_forEach,
  indexOf as _indexOf,
  map as _map
} from 'ember-metal/array';

var splice = Array.prototype.splice;

/**
  Defines some convenience methods for working with Enumerables.
  `Ember.EnumerableUtils` uses `Ember.ArrayPolyfills` when necessary.

  @class EnumerableUtils
  @namespace Ember
  @static
 */

/**
  Creates and returns a new array with the results of calling the specified
  `callback` on each element in the enumerable. This method corresponds to
  `map()` defined in ES2015.

  The callback function you provide should have the following signature (all
  parameters are optional):

  ```javascript
  function(item, index, enumerable);
  ```

  - `item` is the current item in the iteration.
  - `index` is the current index in the iteration.
  - `enumerable` is the enumerable object itself.

  The `callback` function should return the mapped value.

  Note that in addition to a `callback`, you can also pass an optional target
  object that will be set as `this` on the context. This is a good way
  to give your iterator function access to the current object.

  @method map
  @param {Object} object The enumerable to iterate over.
  @param {Function} callback The function invoked per iteration.
  @param {Object} [target] The target object to use.
  @return {Array} The mapped array.
 */
export function map(object, callback, thisArg) {
  return object.map ? object.map(callback, thisArg) : _map.call(object, callback, thisArg);
}

/**
  Iterates through the enumerable, calling the specified `callback` on each
  item. This method corresponds to the `forEach()` method defined in
  ES2015.

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
  @param {Object} object The enumerable to iterate over.
  @param {Function} callback The function invoked per iteration.
  @param {Object} [target] The target object to use.
  @return {Object} receiver
 */
export function forEach(object, callback, thisArg) {
  return object.forEach ? object.forEach(callback, thisArg) : a_forEach.call(object, callback, thisArg);
}

/**
  Creates and returns a new array with all of the elements in the enumeration
  that pass the test implemented by the `callback` function. This method
  corresponds to `filter()` defined in ES2015.

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
  @param {Object} object The enumerable to iterate over.
  @param {Function} callback The function invoked per iteration.
  @param {Object} [target] The target object to use.
  @return {Array} The new filtered array.
 */
export function filter(obj, callback, thisArg) {
  return obj.filter ? obj.filter(callback, thisArg) : _filter.call(obj, callback, thisArg);
}

/**
  Returns the index at which the first occurence of `element` is found in `object`, or
  -1 if it is not present.

  ```js
  var arr = ['a', 'b', 'c', 'd', 'a'];

  Ember.EnumerableUtils.indexOf(arr, 'a');       //  0
  Ember.EnumerableUtils.indexOf(arr, 'z');       // -1
  Ember.EnumerableUtils.indexOf(arr, 'a', 2);    //  4
  Ember.EnumerableUtils.indexOf(arr, 'a', -1);   //  4
  Ember.EnumerableUtils.indexOf(arr, 'b', 3);    // -1
  Ember.EnumerableUtils.indexOf(arr, 'a', 100);  // -1
  ```

  @method indexOf
  @param {Object} object The enumerable to search.
  @param {Object} element The element to locate in the enumerable.
  @param {Number} fromIndex The index from which to start the search. If negative, it is
  used as the offset from the end of the enumerable. If greater than or equal to the
  enumerable's length, the enumerable is not searched and -1 is returned. Default: 0.
  @return {Number} The index of the found element else -1 if not present.
 */
export function indexOf(object, element, fromIndex) {
  return object.indexOf ? object.indexOf(element, fromIndex) : _indexOf.call(object, element, fromIndex);
}

/**
  Returns an array of first occurence indexes for each element in `elements` as found in `object`.

  ```js
  var array = [1, 2, 3, 4, 5];
  Ember.EnumerableUtils.indexesOf(array, [2, 5]);     // [1, 4]

  var fubar = "Fubarr";
  Ember.EnumerableUtils.indexesOf(fubar, ['b', 'r']); // [2, 4]
  ```

  @method indexesOf
  @param {Object} object The enumerable to search.
  @param {Object} elements The elements to locate in the enumerable.
  @return {Array} The array of indexes for each element in `elements` with -1 for each
  element not present.
 */
export function indexesOf(object, elements) {
  return elements === undefined ? [] : map(elements, (item) => {
    return indexOf(object, item);
  });
}

/**
  Adds an element to the array. If the array already contains the element, it is not
  added.

  @method addObject
  @param {Object} array The array to modify.
  @param {Object} element The element to add.
  @return 'undefined'
 */
export function addObject(array, element) {
  var index = indexOf(array, element);
  if (index === -1) { array.push(element); }
}

/**
  Removes an element from the array.

  @method removeObject
  @param {Object} array The array to modify.
  @param {Object} element The element to remove.
  @return 'undefined'
 */
export function removeObject(array, element) {
  var index = indexOf(array, element);
  if (index !== -1) { array.splice(index, 1); }
}

export function _replace(array, idx, amt, objects) {
  var args = [].concat(objects);
  var ret = [];
  // https://code.google.com/p/chromium/issues/detail?id=56588
  var size = 60000;
  var start = idx;
  var ends = amt;
  var count, chunk;

  while (args.length) {
    count = ends > size ? size : ends;
    if (count <= 0) { count = 0; }

    chunk = args.splice(0, size);
    chunk = [start, count].concat(chunk);

    start += size;
    ends -= count;

    ret = ret.concat(splice.apply(array, chunk));
  }
  return ret;
}

/**
  Replaces objects in the `array` with the specified `elements`.

  ```javascript
  var array = [1,2,3];
  Ember.EnumerableUtils.replace(array, 1, 2, [4, 5]);  // [1, 4, 5]

  var array = [1,2,3];
  Ember.EnumerableUtils.replace(array, 1, 1, [4, 5]);  // [1, 4, 5, 3]

  var array = [1,2,3];
  Ember.EnumerableUtils.replace(array, 10, 1, [4, 5]); // [1, 2, 3, 4, 5]
  ```

  @method replace
  @param {Array} array The array to modify.
  @param {Number} fromIndex The index from which to start the replacement. If greater than
  or equal to the array's length, appends to the end of the array.
  @param {Number} amt The number of elements that should be removed from the array,
  starting at `fromIndex`.
  @param {Array} elements The array of objects to insert.
  @return {Array} The modified array.
 */
export function replace(array, fromIndex, amt, elements) {
  if (array.replace) {
    return array.replace(fromIndex, amt, elements);
  } else {
    return _replace(array, fromIndex, amt, elements);
  }
}

/**
  Calculates the intersection of two arrays and returns a new array
  containing shared elements. If there are no shared elements, an
  empty array will be returned.

  ```javascript
  var array1 = [1, 2, 3, 4, 5];
  var array2 = [1, 3, 5, 6, 7];

  Ember.EnumerableUtils.intersection(array1, array2); // [1, 3, 5]

  var array1 = [1, 2, 3];
  var array2 = [4, 5, 6];

  Ember.EnumerableUtils.intersection(array1, array2); // []
  ```

  @method intersection
  @param {Array} array1 The first array to inspect.
  @param {Array} array2 The second array to inspect.
  @return {Array} The new array containing shared elements.
 */
export function intersection(array1, array2) {
  var result = [];
  forEach(array1, (element) => {
    if (indexOf(array2, element) >= 0) {
      result.push(element);
    }
  });

  return result;
}

// TODO: this only exists to maintain the existing api, as we move forward it
// should only be part of the "global build" via some shim
export default {
  _replace: _replace,
  addObject: addObject,
  filter: filter,
  forEach: forEach,
  indexOf: indexOf,
  indexesOf: indexesOf,
  intersection: intersection,
  map: map,
  removeObject: removeObject,
  replace: replace
};
