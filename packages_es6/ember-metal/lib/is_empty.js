import Ember from 'ember-metal/core'; // deprecateFunc
import {get} from 'ember-metal/property_get';
import isNone from 'ember-metal/is_none';

/**
  Verifies that a value is `null` or an empty string, empty array,
  or empty function.

  Constrains the rules on `Ember.isNone` by returning false for empty
  string and empty arrays.

  ```javascript
  Ember.isEmpty();                // true
  Ember.isEmpty(null);            // true
  Ember.isEmpty(undefined);       // true
  Ember.isEmpty('');              // true
  Ember.isEmpty([]);              // true
  Ember.isEmpty('Adam Hawkins');  // false
  Ember.isEmpty([0,1,2]);         // false
  ```

  @method isEmpty
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
var isEmpty = function(obj) {
  return isNone(obj) || (obj.length === 0 && typeof obj !== 'function') || (typeof obj === 'object' && get(obj, 'length') === 0);
};
var empty = Ember.deprecateFunc("Ember.empty is deprecated. Please use Ember.isEmpty instead.", isEmpty);

export default isEmpty;
export {isEmpty, empty};
