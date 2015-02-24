/**
 * lodash 3.3.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="es" include="filter,forEach,indexOf,lastIndexOf,isBoolean,isEmpty,isFunction,isObject,map,merge" -o ./packages/lodash/lib`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
import binaryIndex from '../internal/binaryIndex';
import indexOfNaN from '../internal/indexOfNaN';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * This method is like `_.indexOf` except that it iterates over elements of
 * `array` from right to left.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {boolean|number} [fromIndex=array.length-1] The index to search from
 *  or `true` to perform a binary search on a sorted array.
 * @returns {number} Returns the index of the matched value, else `-1`.
 * @example
 *
 * _.lastIndexOf([1, 2, 1, 2], 2);
 * // => 3
 *
 * // using `fromIndex`
 * _.lastIndexOf([1, 2, 1, 2], 2, 2);
 * // => 1
 *
 * // performing a binary search
 * _.lastIndexOf([1, 1, 2, 2], 2, true);
 * // => 3
 */
function lastIndexOf(array, value, fromIndex) {
  var length = array ? array.length : 0;
  if (!length) {
    return -1;
  }
  var index = length;
  if (typeof fromIndex == 'number') {
    index = (fromIndex < 0 ? nativeMax(length + fromIndex, 0) : nativeMin(fromIndex || 0, length - 1)) + 1;
  } else if (fromIndex) {
    index = binaryIndex(array, value, true) - 1;
    var other = array[index];
    return (value === value ? value === other : other !== other) ? index : -1;
  }
  if (value !== value) {
    return indexOfNaN(array, index, true);
  }
  while (index--) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

export default lastIndexOf;
