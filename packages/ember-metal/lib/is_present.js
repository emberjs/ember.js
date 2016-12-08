import isBlank from './is_blank';

/**
  A value is present if it not `isBlank`.

  ```javascript
  Ember.isPresent();                // false
  Ember.isPresent(null);            // false
  Ember.isPresent(undefined);       // false
  Ember.isPresent('');              // false
  Ember.isPresent('  ');            // false
  Ember.isPresent('\n\t');          // false
  Ember.isPresent([]);              // false
  Ember.isPresent({ length: 0 })    // false
  Ember.isPresent(false);           // true
  Ember.isPresent(true);            // true
  Ember.isPresent('string');        // true
  Ember.isPresent(0);               // true
  Ember.isPresent(function() {})    // true
  Ember.isPresent({});              // true
  Ember.isPresent(false);           // true
  Ember.isPresent('\n\t Hello');    // true
  Ember.isPresent([1,2,3]);         // true
  ```

  @method isPresent
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
  @since 1.8.0
  @public
*/
export default function isPresent(obj) {
  return !isBlank(obj);
}
