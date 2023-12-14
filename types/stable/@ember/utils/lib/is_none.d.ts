declare module '@ember/utils/lib/is_none' {
  /**
     @module @ember/utils
    */
  /**
      Returns true if the passed value is null or undefined. This avoids errors
      from JSLint complaining about use of ==, which can be technically
      confusing.

      ```javascript
      isNone(null);          // true
      isNone(undefined);     // true
      isNone('');            // false
      isNone([]);            // false
      isNone(function() {}); // false
      ```

      @method isNone
      @static
      @for @ember/utils
      @param {Object} obj Value to test
      @return {Boolean}
      @public
    */
  export default function isNone(obj: any): obj is null | undefined;
}
