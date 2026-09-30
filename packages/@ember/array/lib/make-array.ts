const { isArray } = Array;
/**
 @module @ember/array
*/
/**
 Forces the passed object to be part of an array.
 An array is returned as is, and any other object is wrapped in an array.
 `null` and `undefined` become an empty array.

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
function makeArray<T, TT>(obj: T): T extends TT[] ? T : T extends null | undefined ? [] : [T];
function makeArray(obj: any | null | undefined): Array<any | null | undefined> {
  if (obj === null || obj === undefined) {
    return [];
  }
  return isArray(obj) ? obj : [obj];
}

export default makeArray;
