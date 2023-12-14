import typeOf from './type-of';
import { Comparable } from '@ember/-internals/runtime';
import { assert } from '@ember/debug';
const TYPE_ORDER = {
  undefined: 0,
  null: 1,
  boolean: 2,
  number: 3,
  string: 4,
  array: 5,
  object: 6,
  instance: 7,
  function: 8,
  class: 9,
  date: 10,
  regexp: 11,
  filelist: 12,
  error: 13
};
//
// the spaceship operator
//
//                      `. ___
//                     __,' __`.                _..----....____
//         __...--.'``;.   ,.   ;``--..__     .'    ,-._    _.-'
//   _..-''-------'   `'   `'   `'     O ``-''._   (,;') _,'
// ,'________________                          \`-._`-','
//  `._              ```````````------...___   '-.._'-:
//     ```--.._      ,.                     ````--...__\-.
//             `.--. `-` "INFINITY IS LESS     ____    |  |`
//               `. `.   THAN BEYOND"        ,'`````.  ;  ;`
//                 `._`.        __________   `.      \'__/`
//                    `-:._____/______/___/____`.     \  `
//                                |       `._    `.    \
//                                `._________`-.   `.   `.___
//                                              SSt  `------'`
function spaceship(a, b) {
  // SAFETY: `Math.sign` always returns `-1` for negative, `0` for zero, and `1`
  // for positive numbers. (The extra precision is useful for the way we use
  // this in the context of `compare`.)
  return Math.sign(a - b);
}
/**
 @module @ember/utils
*/
/**
 Compares two javascript values and returns:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

  ```javascript
  import { compare } from '@ember/utils';

  compare('hello', 'hello');  // 0
  compare('abc', 'dfg');      // -1
  compare(2, 1);              // 1
  ```

 If the types of the two objects are different precedence occurs in the
 following order, with types earlier in the list considered `<` types
 later in the list:

  - undefined
  - null
  - boolean
  - number
  - string
  - array
  - object
  - instance
  - function
  - class
  - date

  ```javascript
  import { compare } from '@ember/utils';

  compare('hello', 50);       // 1
  compare(50, 'hello');       // -1
  ```

 @method compare
 @for @ember/utils
 @static
 @param {Object} v First value to compare
 @param {Object} w Second value to compare
 @return {Number} -1 if v < w, 0 if v = w and 1 if v > w.
 @public
*/
export default function compare(v, w) {
  if (v === w) {
    return 0;
  }
  let type1 = typeOf(v);
  let type2 = typeOf(w);
  if (type1 === 'instance' && isComparable(v) && v.constructor.compare) {
    return v.constructor.compare(v, w);
  }
  if (type2 === 'instance' && isComparable(w) && w.constructor.compare) {
    // SAFETY: Multiplying by a negative just changes the sign
    return w.constructor.compare(w, v) * -1;
  }
  let res = spaceship(TYPE_ORDER[type1], TYPE_ORDER[type2]);
  if (res !== 0) {
    return res;
  }
  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
      assert('both are boolean', typeof v === 'boolean' && typeof w === 'boolean');
      return spaceship(Number(v), Number(w));
    case 'number':
      assert('both are numbers', typeof v === 'number' && typeof w === 'number');
      return spaceship(v, w);
    case 'string':
      assert('both are strings', typeof v === 'string' && typeof w === 'string');
      return spaceship(v.localeCompare(w), 0);
    case 'array':
      {
        assert('both are arrays', Array.isArray(v) && Array.isArray(w));
        let vLen = v.length;
        let wLen = w.length;
        let len = Math.min(vLen, wLen);
        for (let i = 0; i < len; i++) {
          let r = compare(v[i], w[i]);
          if (r !== 0) {
            return r;
          }
        }
        // all elements are equal now
        // shorter array should be ordered first
        return spaceship(vLen, wLen);
      }
    case 'instance':
      if (isComparable(v) && v.compare) {
        return v.compare(v, w);
      }
      return 0;
    case 'date':
      assert('both are dates', v instanceof Date && w instanceof Date);
      return spaceship(v.getTime(), w.getTime());
    default:
      return 0;
  }
}
function isComparable(value) {
  return Comparable.detect(value);
}