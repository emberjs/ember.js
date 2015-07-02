/**
  Returns true if the passed value is not null or undefined. This avoids errors
  from JSLint complaining about use of !=, which can be technically
  confusing.

  ```javascript
  Ember.isSome();              // false
  Ember.isSome(null);          // false
  Ember.isSome(undefined);     // false
  Ember.isSome('');            // true
  Ember.isSome([]);            // true
  Ember.isSome(function() {});  // true
  ```

  @method isSome
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
*/
function isSome(obj) {
  return obj !== null && obj !== undefined;
}

export default isSome;

