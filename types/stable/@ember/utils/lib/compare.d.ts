declare module '@ember/utils/lib/compare' {
  type Compare = -1 | 0 | 1;
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
  export default function compare<T>(v: T, w: T): Compare;
  export {};
}
