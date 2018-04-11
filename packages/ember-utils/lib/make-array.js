const { isArray } = Array;
/**
 @module @ember/array
*/
/**
 Forces the passed object to be part of an array. If the object is already
 an array, it will return the object. Otherwise, it will add the object to
 an array. If object is `null` or `undefined`, it will return an empty array.

 ```javascript
 import { makeArray } from '@ember/array';
 import ArrayProxy from '@ember/array/proxy';

 makeArray();            // []
 makeArray(null);        // []
 makeArray(undefined);   // []
 makeArray('lindsay');   // ['lindsay']
 makeArray([1, 2, 42]);  // [1, 2, 42]

 let proxy = ArrayProxy.create({ content: [] });

 makeArray(proxy) === proxy;  // false
 ```

 @method makeArray
 @static
 @for @ember/array
 @param {Object} obj the object
 @return {Array}
 @private
 */
export default function makeArray(obj) {
  if (obj === null || obj === undefined) {
    return [];
  }
  return isArray(obj) ? obj : [obj];
}
