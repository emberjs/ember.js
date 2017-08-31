import { get } from './property_get';
import isNone from './is_none';
/**
 @module @ember/utils
*/
/**
  Verifies that a value is `null` or `undefined`, an empty string, or an empty
  array.

  Constrains the rules on `isNone` by returning true for empty strings and
  empty arrays.

  ```javascript
  isEmpty();                // true
  isEmpty(null);            // true
  isEmpty(undefined);       // true
  isEmpty('');              // true
  isEmpty([]);              // true
  isEmpty({});              // false
  isEmpty('Adam Hawkins');  // false
  isEmpty([0,1,2]);         // false
  isEmpty('\n\t');          // false
  isEmpty('  ');            // false
  ```

  @method isEmpty
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @public
*/
export default function isEmpty(obj) {
  let none = isNone(obj);
  if (none) {
    return none;
  }

  if (typeof obj.size === 'number') {
    return !obj.size;
  }

  let objectType = typeof obj;

  if (objectType === 'object') {
    let size = get(obj, 'size');
    if (typeof size === 'number') {
      return !size;
    }
  }

  if (typeof obj.length === 'number' && objectType !== 'function') {
    return !obj.length;
  }

  if (objectType === 'object') {
    let length = get(obj, 'length');
    if (typeof length === 'number') {
      return !length;
    }
  }

  return false;
}
