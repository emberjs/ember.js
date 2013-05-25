require('ember-metal/property_set');
require('ember-metal/properties');

var set = Ember.set,
    defineProperty = Ember.defineProperty;

/**
  Sets the value of a property on an object avoiding the `unknownProperty` hook,
  instead, if the value is an unknown property, the property is defined on the
  object before setting the property, respecting computed properties and notifying
  observers and other listeners of the change.

  ```javascript
  var controller = Ember.ObjectController.create({
    content: {}
  })

  Ember.shallowSet(controller, 'hello', 'world')

  controller.get('hello')// == 'world'

  // but this set was not proxied to the content
  controller.get('content.hello')// == undefined
  ```

  @method shallowSet
  @for Ember
  @param {Object} obj The object to modify.
  @param {String} keyName The property key to set
  @param {Object} value The value to set
  @return {Object} the passed value.
*/
Ember.shallowSet = function shallowSet(obj, keyName, value) {
  if (!(keyName in obj)) {
    defineProperty(obj, keyName);
  }

  return set(obj, keyName, value);
};
