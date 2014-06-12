/**
@module ember
@submodule ember-runtime
*/

import CoreObject from "ember-runtime/system/core_object";
import Observable from "ember-runtime/mixins/observable";

/**
  `Ember.Object` is the main base class for all Ember objects. It is a subclass
  of `Ember.CoreObject` with the `Ember.Observable` mixin applied. For details,
  see the documentation for each of these.

  @class Object
  @namespace Ember
  @extends Ember.CoreObject
  @uses Ember.Observable
*/
var EmberObject = CoreObject.extend(Observable);
EmberObject.toString = function() {
  return "Ember.Object";
};

export default EmberObject;
