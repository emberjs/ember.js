declare module '@ember/utils/lib/is_blank' {
  /**
     @module @ember/utils
    */
  /**
      A value is blank if it is empty or a whitespace string.

      ```javascript
      import { isBlank } from '@ember/utils';

      isBlank(null);            // true
      isBlank(undefined);       // true
      isBlank('');              // true
      isBlank([]);              // true
      isBlank('\n\t');          // true
      isBlank('  ');            // true
      isBlank({});              // false
      isBlank('\n\t Hello');    // false
      isBlank('Hello world');   // false
      isBlank([1,2,3]);         // false
      ```

      @method isBlank
      @static
      @for @ember/utils
      @param {Object} obj Value to test
      @return {Boolean}
      @since 1.5.0
      @public
    */
  export default function isBlank(obj: unknown): boolean;
}
