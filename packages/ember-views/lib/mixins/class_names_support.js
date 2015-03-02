/**
@module ember
@submodule ember-views
*/
import Ember from 'ember-metal/core';
import { Mixin } from "ember-metal/mixin";
import { A as emberA } from "ember-runtime/system/native_array";
import {
  typeOf
} from "ember-metal/utils";

var EMPTY_ARRAY = [];

/**
  @class ClassNamesSupport
  @namespace Ember
*/
var ClassNamesSupport = Mixin.create({
  concatenatedProperties: ['classNames', 'classNameBindings'],

  init() {
    this._super(...arguments);

    Ember.assert("Only arrays are allowed for 'classNameBindings'", typeOf(this.classNameBindings) === 'array');
    this.classNameBindings = emberA(this.classNameBindings.slice());

    Ember.assert("Only arrays of static class strings are allowed for 'classNames'. For dynamic classes, use 'classNameBindings'.", typeOf(this.classNames) === 'array');
    this.classNames = emberA(this.classNames.slice());
  },

  /**
    Standard CSS class names to apply to the view's outer element. This
    property automatically inherits any class names defined by the view's
    superclasses as well.

    @property classNames
    @type Array
    @default ['ember-view']
  */
  classNames: ['ember-view'],

  /**
    A list of properties of the view to apply as class names. If the property
    is a string value, the value of that string will be applied as a class
    name.

    ```javascript
    // Applies the 'high' class to the view element
    Ember.View.extend({
      classNameBindings: ['priority']
      priority: 'high'
    });
    ```

    If the value of the property is a Boolean, the name of that property is
    added as a dasherized class name.

    ```javascript
    // Applies the 'is-urgent' class to the view element
    Ember.View.extend({
      classNameBindings: ['isUrgent']
      isUrgent: true
    });
    ```

    If you would prefer to use a custom value instead of the dasherized
    property name, you can pass a binding like this:

    ```javascript
    // Applies the 'urgent' class to the view element
    Ember.View.extend({
      classNameBindings: ['isUrgent:urgent']
      isUrgent: true
    });
    ```

    This list of properties is inherited from the view's superclasses as well.

    @property classNameBindings
    @type Array
    @default []
  */
  classNameBindings: EMPTY_ARRAY
});

export default ClassNamesSupport;
