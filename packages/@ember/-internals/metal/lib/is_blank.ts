import isEmpty from './is_empty';
/**
 @module @ember/utils
*/
/**
  A value is blank if it is empty or a whitespace string.

  ```javascript
  import { isBlank } from '@ember/utils';

  isBlank();                // true
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
export default function isBlank(obj: any): boolean {
  return isEmpty(obj) || (typeof obj === 'string' && /\S/.test(obj) === false);
}
