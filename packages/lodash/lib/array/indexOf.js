/**
 * lodash 3.3.0 (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="es" include="filter,forEach,indexOf,lastIndexOf,isBoolean,isEmpty,isFunction,isObject,map,merge" -o ./packages/lodash/lib`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.7.0 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
import baseIndexOf from '../internal/baseIndexOf';
import binaryIndex from '../internal/binaryIndex';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Gets the index at which the first occurrence of `value` is found in `array`
 * using `SameValueZero` for equality comparisons. If `fromIndex` is negative,
 * it is used as the offset from the end of `array`. If `array` is sorted
 * providing `true` for `fromIndex` performs a faster binary search.
 *
 * **Note:** `SameValueZero` comparisons are like strict equality comparisons,
 * e.g. `===`, except that `NaN` matches `NaN`. See the
 * [ES spec](https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero)
 * for more details.
 *
 * @static
 * @memberOf _
 * @category Array
 * @param {Array} array The array to search.
 * @param {*} value The value to search for.
 * @param {boolean|number} [fromIndex=0] The index to search from or `true`
 *  to perform a binary search on a sorted array.
 * @returns {number} Returns the index of the matched value, else `-1`.
 * @example
 *
 * _.indexOf([1, 2, 1, 2], 2);
 * // => 2
 *
 * // using `fromIndex`
 * _.indexOf([1, 2, 1, 2], 2, 2);
 * // => 3
 *
 * // performing a binary search
 * _.indexOf([1, 1, 2, 2], 2, true);
 * // => 2
 */
function indexOf(array, value, fromIndex) {
  var length = array ? array.length : 0;
  if (!length) {
    return -1;
  }
  if (typeof fromIndex == 'number') {
    fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : (fromIndex || 0);
  } else if (fromIndex) {
    var index = binaryIndex(array, value),
        other = array[index];

    return (value === value ? value === other : other !== other) ? index : -1;
  }
  return baseIndexOf(array, value, fromIndex);
}

export default indexOf;
