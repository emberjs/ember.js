import { get } from '@ember/object';
import { hasUnknownProperty } from '@ember/-internals/metal';
import { deprecate } from '@ember/debug';
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
export default function isEmpty(obj: unknown): boolean {
  deprecate('isEmpty is deprecated. Use @ember/legacy-utils instead.', false, {
    for: 'ember-source',
    id: 'ember-utils.deprecate-isEmpty',
    since: { available: '6.8.0' },
    until: '7.0.0',
  });

  if (obj === null || obj === undefined) {
    return true;
  }

  if (!hasUnknownProperty(obj) && typeof (obj as HasSize).size === 'number') {
    return !(obj as HasSize).size;
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

  if (typeof (obj as HasLength).length === 'number' && typeof obj !== 'function') {
    return !(obj as HasLength).length;
  }

  return false;
}

interface HasSize {
  size: number;
}

interface HasLength {
  length: number;
}
