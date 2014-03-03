import Ember from 'ember-metal/core'; // deprecateFunc

/**
  Returns true if the passed value is null or undefined. This avoids errors
  from JSLint complaining about use of ==, which can be technically
  confusing.

  ```javascript
  Ember.isNone();              // true
  Ember.isNone(null);          // true
  Ember.isNone(undefined);     // true
  Ember.isNone('');            // false
  Ember.isNone([]);            // false
  Ember.isNone(function() {});  // false
  ```

  @method isNone
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
var isNone = function(obj) {
  return obj === null || obj === undefined;
};
var none = Ember.deprecateFunc("Ember.none is deprecated. Please use Ember.isNone instead.", isNone);

export default isNone;
export {isNone, none};
