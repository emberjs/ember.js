require('ember-metal/property_events');
require('ember-metal/property_set');

var changeProperties = Ember.changeProperties,
    set = Ember.set;

/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  ```javascript
  anObject.setProperties({
    firstName: "Stanley",
    lastName: "Stuart",
    age: "21"
  })
  ```

  @method setProperties
  @param self
  @param {Object} hash
  @return self
*/
Ember.setProperties = function(self, hash) {
  changeProperties(function() {
    for(var prop in hash) {
      if (hash.hasOwnProperty(prop)) { set(self, prop, hash[prop]); }
    }
  });
  return self;
};
