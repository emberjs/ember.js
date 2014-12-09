/**
@module ember
@submodule ember-runtime
*/

import Ember from "ember-metal/core"; // Ember.assert
import CoreObject from "ember-runtime/system/core_object";
import Observable from "ember-runtime/mixins/observable";
import { validatePropertyInjections } from "ember-runtime/inject";

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

function injectedPropertyAssertion(props) {
  // Injection validations are a debugging aid only, so ensure that they are
  // not performed in production builds by invoking from an assertion
  Ember.assert("Injected properties are invalid", validatePropertyInjections(this.constructor, props));
}

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  EmberObject.reopen({
    /**
      Provides mixin-time validation for injected properties.

      @private
      @method willMergeMixin
    */
    willMergeMixin: injectedPropertyAssertion
  });
}

export default EmberObject;
