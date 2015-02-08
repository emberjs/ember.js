import isBlank from 'ember-metal/is_blank';

/**
  A value is present if it not `isBlank`.

  ```javascript
  Ember.isPresent();                // false
  Ember.isPresent(null);            // false
  Ember.isPresent(undefined);       // false
  Ember.isPresent('');              // false
  Ember.isPresent([]);              // false
  Ember.isPresent('\n\t');          // false
  Ember.isPresent('  ');            // false
  Ember.isPresent({});              // true
  Ember.isPresent('\n\t Hello');    // true
  Ember.isPresent('Hello world');   // true
  Ember.isPresent([1,2,3]);         // true
  ```

  @method isPresent
  @for Ember
  @param {Object} obj Value to test
  @return {Boolean}
  @since 1.8.0
  */
export default function isPresent(obj) {
  return !isBlank(obj);
}
