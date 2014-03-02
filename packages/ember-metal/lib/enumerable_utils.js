var map, forEach, indexOf, filter, splice;
require('ember-metal/array');

map     = Array.prototype.map     || Ember.ArrayPolyfills.map;
forEach = Array.prototype.forEach || Ember.ArrayPolyfills.forEach;
indexOf = Array.prototype.indexOf || Ember.ArrayPolyfills.indexOf;
filter  = Array.prototype.filter  || Ember.ArrayPolyfills.filter;
splice = Array.prototype.splice;

/**
 * Defines some convenience methods for working with Enumerables.
 * `Ember.EnumerableUtils` uses `Ember.ArrayPolyfills` when necessary.
 *
 * @class EnumerableUtils
 * @namespace Ember
 * @static
 * */
var utils = Ember.EnumerableUtils = {
  /**
   * Calls the map function on the passed object with a specified callback. This
   * uses `Ember.ArrayPolyfill`'s-map method when necessary.
   *
   * @method map
   * @param {Object} obj The object that should be mapped
   * @param {Function} callback The callback to execute
   * @param {Object} thisArg Value to use as this when executing *callback*
   *
   * @return {Array} An array of mapped values.
   */
  map: function(obj, callback, thisArg) {
    return obj.map ? obj.map.call(obj, callback, thisArg) : map.call(obj, callback, thisArg);
  },

  /**
   * Calls the forEach function on the passed object with a specified callback. This
   * uses `Ember.ArrayPolyfill`'s-forEach method when necessary.
   *
   * @method forEach
   * @param {Object} obj The object to call forEach on
   * @param {Function} callback The callback to execute
   * @param {Object} thisArg Value to use as this when executing *callback*
   *
   */
  forEach: function(obj, callback, thisArg) {
    return obj.forEach ? obj.forEach.call(obj, callback, thisArg) : forEach.call(obj, callback, thisArg);
  },

  /**
   * Calls the filter function on the passed object with a specified callback. This
   * uses `Ember.ArrayPolyfill`'s-filter method when necessary.
   *
   * @method filter
   * @param {Object} obj The object to call filter on
   * @param {Function} callback The callback to execute
   * @param {Object} thisArg Value to use as this when executing *callback*
   *
   * @return {Array} An array containing the filtered values
   */
  filter: function(obj, callback, thisArg) {
    return obj.filter ? obj.filter.call(obj, callback, thisArg) : filter.call(obj, callback, thisArg);
  },

  /**
   * Calls the indexOf function on the passed object with a specified callback. This
   * uses `Ember.ArrayPolyfill`'s-indexOf method when necessary.
   *
   * @method indexOf
   * @param {Object} obj The object to call indexOn on
   * @param {Function} callback The callback to execute
   * @param {Object} index The index to start searching from
   *
   */
  indexOf: function(obj, element, index) {
    return obj.indexOf ? obj.indexOf.call(obj, element, index) : indexOf.call(obj, element, index);
  },

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
   * @param {Object} obj The object to check for element indexes
   * @param {Array} elements The elements to search for on *obj*
   *
   * @return {Array} An array of indexes.
   *
   */
  indexesOf: function(obj, elements) {
    return elements === undefined ? [] : utils.map(elements, function(item) {
      return utils.indexOf(obj, item);
    });
  },

  /** 
   * Adds an object to an array. If the array already includes the object this
   * method has no effect.
   *
   * @method addObject
   * @param {Array} array The array the passed item should be added to
   * @param {Object} item The item to add to the passed array
   *
   * @return 'undefined'
   */
  addObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index === -1) { array.push(item); }
  },

  /**
   * Removes an object from an array. If the array does not contain the passed
   * object this method has no effect.
   *
   * @method removeObject
   * @param {Array} array The array to remove the item from.
   * @param {Object} item The item to remove from the passed array.
   *
   * @return 'undefined'
   */
  removeObject: function(array, item) {
    var index = utils.indexOf(array, item);
    if (index !== -1) { array.splice(index, 1); }
  },

  _replace: function(array, idx, amt, objects) {
    var args = [].concat(objects), chunk, ret = [],
        // https://code.google.com/p/chromium/issues/detail?id=56588
        size = 60000, start = idx, ends = amt, count;

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
  },

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
   * @param {Array} array The array the objects should be inserted into.
   * @param {Number} idx Starting index in the array to replace. If *idx* >=
   * length, then append to the end of the array.
   * @param {Number} amt Number of elements that should be remove from the array,
   * starting at *idx*
   * @param {Array} objects An array of zero or more objects that should be
   * inserted into the array at *idx*
   *
   * @return {Array} The changed array.
   */
  replace: function(array, idx, amt, objects) {
    if (array.replace) {
      return array.replace(idx, amt, objects);
    } else {
      return utils._replace(array, idx, amt, objects);
    }
  },

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
   * @param {Array} array1 The first array
   * @param {Array} array2 The second array
   *
   * @return {Array} The intersection of the two passed arrays.
   */
  intersection: function(array1, array2) {
    var intersection = [];

    utils.forEach(array1, function(element) {
      if (utils.indexOf(array2, element) >= 0) {
        intersection.push(element);
      }
    });

    return intersection;
  }
};
