/**
 @module @ember/utils
*/

import { deprecate } from '@ember/debug';

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
export default function isNone(obj: any): obj is null | undefined {
  deprecate('isNone is deprecated. Use @ember/legacy-utils instead.', false, {
    for: 'ember-source',
    id: 'ember-utils.deprecate-isNone',
    since: { available: '6.8.0' },
    until: '7.0.0',
  });

  return obj === null || obj === undefined;
}
