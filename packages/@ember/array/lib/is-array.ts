import { DEBUG } from '@glimmer/env';
import { PROXY_CONTENT } from '@ember/-internals/metal/lib/property_get';
import typeOf from '@ember/utils/lib/type-of';
import { isEmberArray } from '@ember/array/-internals';
import type EmberArray from '@ember/array';

/**
 @module @ember/array
*/

/**
  Returns true if the passed object is an array or Array-like.

  Objects are considered Array-like if any of the following are true:

    - the object is a native Array
    - the object has an objectAt property
    - the object is an Object, and has a length property

  Unlike `typeOf` this method returns true even if the passed object is
  not formally an array but appears to be array-like (i.e. implements `Array`)

  ```javascript
  import { isArray } from '@ember/array';
  import ArrayProxy from '@ember/array/proxy';

  isArray();                                      // false
  isArray([]);                                    // true
  isArray(ArrayProxy.create({ content: [] }));    // true
  ```

  @method isArray
  @static
  @for @ember/array
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
  @public
*/
export default function isArray(obj: unknown): obj is ArrayLike<unknown> | EmberArray<unknown> {
  if (DEBUG && typeof obj === 'object' && obj !== null) {
    // SAFETY: Property read checks are safe if it's an object
    let possibleProxyContent = (obj as any)[PROXY_CONTENT];
    if (possibleProxyContent !== undefined) {
      obj = possibleProxyContent;
    }
  }

  // SAFETY: Property read checks are safe if it's an object
  if (!obj || (obj as any).setInterval) {
    return false;
  }

  // EmberArray's `init` brands every instance via `setEmberArray`; the only
  // unbranded EmberArray objects are native arrays upgraded by `A()`, which
  // `Array.isArray` catches. So this matches `EmberArray.detect` without
  // pulling in the mixin's module.
  if (Array.isArray(obj) || isEmberArray(obj)) {
    return true;
  }

  let type = typeOf(obj);
  if ('array' === type) {
    return true;
  }

  // SAFETY: Property read checks are safe if it's an object
  let length = (obj as any).length;
  if (typeof length === 'number' && length === length && 'object' === type) {
    return true;
  }

  return false;
}
