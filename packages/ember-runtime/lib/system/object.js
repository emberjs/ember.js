require('ember-runtime/mixins/observable');
require('ember-runtime/system/core_object');

/**
@module ember
@submodule ember-runtime
*/

if (Ember.FEATURES.isEnabled("em-o")) {
  /**
    Shorthand for `Ember.Object.create(properties)`.

    Wraps a vanilla/native object in an `Ember.Object` instance with the same
    properties. The `properties` argument will not be altered.

    If you pass an instance of `Ember.Object` as the `properties` argument, the
    same object will be returned.
 
    Example:
 
    ```javascript
    var john1 = Ember.O({name: 'John'});
    //...has the same effect as:
    var john2 = Ember.Object.create({name: 'John'});

    console.log(john1 === Em.O(john1); //true
    ```
 
    @param {Object} [properties]
    @returns Ember.Object
  */
  Ember.O = function(properties) {
    return Ember.Object.detectInstance(properties) ? properties : Ember.Object.create(properties);
  };
}

/**
  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @class Object
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.Observable
*/
Ember.Object = Ember.CoreObject.extend(Ember.Observable);
Ember.Object.toString = function() { return "Ember.Object"; };
