declare module '@ember/utils/lib/is_empty' {
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
  export default function isEmpty(obj: unknown): boolean;
}
