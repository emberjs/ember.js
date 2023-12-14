import { get } from '@ember/object';
import { hasUnknownProperty } from '@ember/-internals/metal';
/**
 @module @ember/utils
*/
/**
  Verifies that a value is `null` or `undefined`, an empty string, or an empty
  array.

  Constrains the rules on `isNone` by returning true for empty strings and
  empty arrays.

  If the value is an object with a `size` property of type number, it is used
  to check emptiness.

  ```javascript
  isEmpty(null);             // true
  isEmpty(undefined);        // true
  isEmpty('');               // true
  isEmpty([]);               // true
  isEmpty({ size: 0});       // true
  isEmpty({});               // false
  isEmpty('Adam Hawkins');   // false
  isEmpty([0,1,2]);          // false
  isEmpty('\n\t');           // false
  isEmpty('  ');             // false
  isEmpty({ size: 1 })       // false
  isEmpty({ size: () => 0 }) // false
  ```

  @method isEmpty
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @public
*/
export default function isEmpty(obj) {
  if (obj === null || obj === undefined) {
    return true;
  }
  if (!hasUnknownProperty(obj) && typeof obj.size === 'number') {
    return !obj.size;
  }
  if (typeof obj === 'object') {
    let size = get(obj, 'size');
    if (typeof size === 'number') {
      return !size;
    }
    let length = get(obj, 'length');
    if (typeof length === 'number') {
      return !length;
    }
  }
  if (typeof obj.length === 'number' && typeof obj !== 'function') {
    return !obj.length;
  }
  return false;
}