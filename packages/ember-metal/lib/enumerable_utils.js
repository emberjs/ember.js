import Ember from 'ember-metal/core'; // Ember.deprecateFunc
import {
  filter as _filter,
  forEach as a_forEach,
  indexOf as _indexOf,
  map as _map
} from 'ember-metal/array';

var splice = Array.prototype.splice;

/**
 * Defines some convenience methods for working with Enumerables.
 * `Ember.EnumerableUtils` uses `Ember.ArrayPolyfills` when necessary.
 *
 * @class EnumerableUtils
 * @namespace Ember
 * @deprecated
 * @static
 * */

/**
 * Calls the map function on the passed object with a specified callback. This
 * uses `Ember.ArrayPolyfill`'s-map method when necessary.
 *
 * @method map
 * @deprecated Use ES5's Array.prototype.map instead.
 * @param {Object} obj The object that should be mapped
 * @param {Function} callback The callback to execute
 * @param {Object} thisArg Value to use as this when executing *callback*
 *
 * @return {Array} An array of mapped values.
 */
export function map(obj, callback, thisArg) {
  return obj.map ? obj.map(callback, thisArg) : _map.call(obj, callback, thisArg);
}
var deprecatedMap = Ember.deprecateFunc('Ember.EnumberableUtils.map is deprecated, please refactor to use Array.prototype.map.', map);

/**
 * Calls the forEach function on the passed object with a specified callback. This
 * uses `Ember.ArrayPolyfill`'s-forEach method when necessary.
 *
 * @method forEach
 * @deprecated Use ES5's Array.prototype.forEach instead.
 * @param {Object} obj The object to call forEach on
 * @param {Function} callback The callback to execute
 * @param {Object} thisArg Value to use as this when executing *callback*
 *
 */
export function forEach(obj, callback, thisArg) {
  return obj.forEach ? obj.forEach(callback, thisArg) : a_forEach.call(obj, callback, thisArg);
}
var deprecatedForEach = Ember.deprecateFunc('Ember.EnumberableUtils.forEach is deprecated, please refactor to use Array.prototype.forEach.', forEach);

/**
 * Calls the filter function on the passed object with a specified callback. This
 * uses `Ember.ArrayPolyfill`'s-filter method when necessary.
 *
 * @method filter
 * @deprecated Use ES5's Array.prototype.filter instead.
 * @param {Object} obj The object to call filter on
 * @param {Function} callback The callback to execute
 * @param {Object} thisArg Value to use as this when executing *callback*
 *
 * @return {Array} An array containing the filtered values
 * @since 1.4.0
 */
export function filter(obj, callback, thisArg) {
  return obj.filter ? obj.filter(callback, thisArg) : _filter.call(obj, callback, thisArg);
}
var deprecatedFilter = Ember.deprecateFunc('Ember.EnumberableUtils.filter is deprecated, please refactor to use Array.prototype.filter.', filter);

/**
 * Calls the indexOf function on the passed object with a specified callback. This
 * uses `Ember.ArrayPolyfill`'s-indexOf method when necessary.
 *
 * @method indexOf
 * @deprecated Use ES5's Array.prototype.indexOf instead.
 * @param {Object} obj The object to call indexOn on
 * @param {Function} callback The callback to execute
 * @param {Object} index The index to start searching from
 *
 */
export function indexOf(obj, element, index) {
  return obj.indexOf ? obj.indexOf(element, index) : _indexOf.call(obj, element, index);
}
var deprecatedIndexOf = Ember.deprecateFunc('Ember.EnumberableUtils.indexOf is deprecated, please refactor to use Array.prototype.indexOf.', indexOf);

/**
 * Returns an array of indexes of the first occurrences of the passed elements
 * on the passed object.
 *
 * ```javascript
 *  var array = [1, 2, 3, 4, 5];
 *  Ember.EnumerableUtils.indexesOf(array, [2, 5]); // [1, 4]
 *
 *  var fubar = "Fubarr";
 *  Ember.EnumerableUtils.indexesOf(fubar, ['b', 'r']); // [2, 4]
 * ```
 *
 * @method indexesOf
 * @deprecated
 * @param {Object} obj The object to check for element indexes
 * @param {Array} elements The elements to search for on *obj*
 *
 * @return {Array} An array of indexes.
 *
 */
export function indexesOf(obj, elements) {
  return elements === undefined ? [] : map(elements, (item) => {
    return indexOf(obj, item);
  });
}
var deprecatedIndexesOf = Ember.deprecateFunc('Ember.EnumerableUtils.indexesOf is deprecated.', indexesOf);

/**
 * Adds an object to an array. If the array already includes the object this
 * method has no effect.
 *
 * @method addObject
 * @deprecated
 * @param {Array} array The array the passed item should be added to
 * @param {Object} item The item to add to the passed array
 *
 * @return 'undefined'
 */
export function addObject(array, item) {
  var index = indexOf(array, item);
  if (index === -1) { array.push(item); }
}
var deprecatedAddObject = Ember.deprecateFunc('Ember.EnumerableUtils.addObject is deprecated.', addObject);

/**
 * Removes an object from an array. If the array does not contain the passed
 * object this method has no effect.
 *
 * @method removeObject
 * @deprecated
 * @param {Array} array The array to remove the item from.
 * @param {Object} item The item to remove from the passed array.
 *
 * @return 'undefined'
 */
export function removeObject(array, item) {
  var index = indexOf(array, item);
  if (index !== -1) { array.splice(index, 1); }
}
var deprecatedRemoveObject = Ember.deprecateFunc('Ember.EnumerableUtils.removeObject is deprecated.', removeObject);

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
 * Replaces objects in an array with the passed objects.
 *
 * ```javascript
 *   var array = [1,2,3];
 *   Ember.EnumerableUtils.replace(array, 1, 2, [4, 5]); // [1, 4, 5]
 *
 *   var array = [1,2,3];
 *   Ember.EnumerableUtils.replace(array, 1, 1, [4, 5]); // [1, 4, 5, 3]
 *
 *   var array = [1,2,3];
 *   Ember.EnumerableUtils.replace(array, 10, 1, [4, 5]); // [1, 2, 3, 4, 5]
 * ```
 *
 * @method replace
 * @deprecated
 * @param {Array} array The array the objects should be inserted into.
 * @param {Number} idx Starting index in the array to replace. If *idx* >=
 * length, then append to the end of the array.
 * @param {Number} amt Number of elements that should be removed from the array,
 * starting at *idx*
 * @param {Array} objects An array of zero or more objects that should be
 * inserted into the array at *idx*
 *
 * @return {Array} The modified array.
 */
export function replace(array, idx, amt, objects) {
  if (array.replace) {
    return array.replace(idx, amt, objects);
  } else {
    return _replace(array, idx, amt, objects);
  }
}
var deprecatedReplace = Ember.deprecateFunc('Ember.EnumerableUtils.replace is deprecated.', replace);

/**
 * Calculates the intersection of two arrays. This method returns a new array
 * filled with the records that the two passed arrays share with each other.
 * If there is no intersection, an empty array will be returned.
 *
 * ```javascript
 * var array1 = [1, 2, 3, 4, 5];
 * var array2 = [1, 3, 5, 6, 7];
 *
 * Ember.EnumerableUtils.intersection(array1, array2); // [1, 3, 5]
 *
 * var array1 = [1, 2, 3];
 * var array2 = [4, 5, 6];
 *
 * Ember.EnumerableUtils.intersection(array1, array2); // []
 * ```
 *
 * @method intersection
 * @deprecated
 * @param {Array} array1 The first array
 * @param {Array} array2 The second array
 *
 * @return {Array} The intersection of the two passed arrays.
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
var deprecatedIntersection = Ember.deprecateFunc('Ember.EnumerableUtils.intersection is deprecated.', intersection);

// TODO: this only exists to maintain the existing api, as we move forward it
// should only be part of the "global build" via some shim
export default {
  _replace: _replace,
  addObject: deprecatedAddObject,
  filter: deprecatedFilter,
  forEach: deprecatedForEach,
  indexOf: deprecatedIndexOf,
  indexesOf: deprecatedIndexesOf,
  intersection: deprecatedIntersection,
  map: deprecatedMap,
  removeObject: deprecatedRemoveObject,
  replace: deprecatedReplace
};
