import Ember from 'ember-metal/core'; // deprecateFunc
import {get} from 'ember-metal/property_get';
import isEmpty from 'ember-metal/is_empty';

var isBlank;

if (Ember.FEATURES.isEnabled('ember-metal-is-blank')) {
  /**
    A value is blank if it is empty or a whitespace string.

    ```javascript
    Ember.isBlank();                // true
    Ember.isBlank(null);            // true
    Ember.isBlank(undefined);       // true
    Ember.isBlank('');              // true
    Ember.isBlank([]);              // true
    Ember.isBlank('\n\t');          // true
    Ember.isBlank('  ');            // true
    Ember.isBlank({});              // false
    Ember.isBlank('\n\t Hello');    // false
    Ember.isBlank('Hello world');   // false
    Ember.isBlank([1,2,3]);         // false
    ```

    @method isBlank
    @for Ember
    @param {Object} obj Value to test
    @return {Boolean}
  */
  isBlank = function(obj) {
    return isEmpty(obj) || (typeof obj === 'string' && obj.match(/\S/) === null);
  };
}

export default isBlank;
