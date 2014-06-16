import { get } from 'ember-metal/property_get';
import isNone from 'ember-metal/is_none';
import __isEmpty__ from 'lodash/objects/isEmpty';
import isBoolean from 'lodash/objects/isBoolean';
import isFunction from 'lodash/objects/isFunction';
import isObject from 'lodash/objects/isObject';

/**
  Verifies that a value is `null` or an empty string, empty array,
  or empty function.

  Constrains the rules on `Ember.isNone` by returning true for empty
  string and empty arrays.

  ```javascript
  Ember.isEmpty();                // true
  Ember.isEmpty(null);            // true
  Ember.isEmpty(undefined);       // true
  Ember.isEmpty('');              // true
  Ember.isEmpty([]);              // true
  Ember.isEmpty({});              // false
  Ember.isEmpty('Adam Hawkins');  // false
  Ember.isEmpty([0,1,2]);         // false
  ```

  @method isEmpty
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
function isEmpty(obj) {
  if (isBoolean(obj) || isFunction(obj) || obj === 0) {
    return false;
  } else if (isObject(obj)) {
    return get(obj, 'length') === 0;
  } else {
    return __isEmpty__(obj);
  }
}

export default isEmpty;
