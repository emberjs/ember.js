import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';

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
  @deprecated Use native JavaScript instead.
*/
export default function isNone(obj: any): obj is null | undefined {
  deprecateUntil(
    '`isNone` from `@ember/utils` is deprecated. Use native JavaScript instead.',
    DEPRECATIONS.DEPRECATE_EMBER_UTILS
  );

  return obj === null || obj === undefined;
}
